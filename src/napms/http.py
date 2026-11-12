"""HTTP DTOs and rendering. Actor resolution always precedes protected handlers."""
import csv
import io
import secrets
from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, model_validator

from .dev import DEMO_REQUEST
from .domain import Problem
from .use_cases import Service

COLUMNS = ("ruleId", "subjectId", "sourceResourceId", "destinationResourceId", "sourceEndpointId", "destinationEndpointId",
           "sourceAddress", "destinationAddress", "ipProtocol", "destinationPortStart", "destinationPortEnd", "readiness",
           "interactionRevisionId", "connectivityNeedId", "requestId", "requesterActorId", "decisionId", "deciderActorId",
           "evaluationAt", "requestSubmittedAt", "decisionAt", "sourceAddressKind", "destinationAddressKind")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProcessInput(Strict):
    name: str = Field(strict=True, min_length=1, max_length=300)
    description: str | None = Field(default=None, strict=True, max_length=10000)
    responsibleOrganization: str | None = Field(default=None, strict=True, max_length=300)


class BusinessProcess(Strict):
    processId: UUID
    name: str | None
    description: str | None
    responsibleOrganization: str | None


class ProcessCollection(Strict):
    items: list[BusinessProcess]
    limit: int
    offset: int
    hasMore: bool


class NeedInput(Strict):
    interactionRevisionId: UUID


class Need(Strict):
    connectivityNeedId: UUID
    processId: UUID
    interactionId: UUID
    componentId: UUID


class NeedOption(Strict):
    interactionRevisionId: UUID
    interactionId: UUID
    applicationId: UUID
    sourceComponentId: UUID
    destinationComponentId: UUID
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int
    destinationPortEnd: int


class NeedCollection(Strict):
    items: list[Need]
    limit: int
    offset: int
    hasMore: bool


class NeedOptions(Strict):
    items: list[NeedOption]
    limit: int
    offset: int
    hasMore: bool


class OptionsQuery(Strict):
    kind: Literal["revisions", "source-deployments", "destination-deployments"] = "revisions"
    interactionRevisionId: UUID | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def valid_kind(self):
        if (self.kind == "revisions") != (self.interactionRevisionId is None):
            raise ValueError("Invalid kind/revision combination")
        return self


class DeploymentOption(Strict):
    deploymentId: UUID
    componentId: UUID
    resourceId: UUID


class RevisionOptions(NeedOptions):
    kind: Literal["revisions"]


class DeploymentOptions(Strict):
    kind: Literal["source-deployments", "destination-deployments"]
    items: list[DeploymentOption]
    limit: int
    offset: int
    hasMore: bool


class Subject(Strict):
    sourceDeploymentId: UUID
    destinationDeploymentId: UUID
    interactionRevisionId: UUID


class AccessInput(Strict):
    model_config = ConfigDict(extra="forbid", json_schema_extra={"example": DEMO_REQUEST})
    sourceDeploymentId: UUID
    destinationDeploymentId: UUID
    interactionRevisionId: UUID
    connectivityNeedId: UUID


class DecisionInput(Strict):
    outcome: Literal["ALLOWED", "DENIED"]


class ListQuery(Strict):
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ExportQuery(Strict):
    ruleId: UUID
    format: Literal["json", "csv"] = "json"


class Admission(Strict):
    sourceResourceId: UUID
    grantId: UUID
    checkedAt: str


class Decision(Strict):
    decisionId: UUID
    requestId: UUID
    outcome: Literal["ALLOWED", "DENIED"]
    deciderActorId: UUID
    decidedAt: str
    policyRuleId: UUID | None


class AccessRequest(Strict):
    connectivityNeedId: UUID
    subject: Subject
    requestId: UUID
    subjectId: UUID
    status: Literal["PENDING", "ALLOWED", "DENIED"]
    submittedAt: str
    requesterActorId: UUID
    admission: Admission
    decision: Decision | None


class RequestCollection(Strict):
    items: list[AccessRequest]
    limit: int
    offset: int
    hasMore: bool


class Rule(Strict):
    ruleId: UUID
    subjectId: UUID
    state: Literal["ACTIVE", "INACTIVE"]
    subject: dict[str, UUID]
    originatingDecision: Decision
    originatingRequest: AccessRequest
    connectivityNeedId: UUID
    allowances: list[Decision]


class PolicyRow(Strict):
    ruleId: UUID
    subjectId: UUID
    sourceResourceId: UUID
    destinationResourceId: UUID
    sourceEndpointId: UUID
    destinationEndpointId: UUID
    sourceAddress: str | None
    destinationAddress: str | None
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int
    destinationPortEnd: int
    readiness: Literal["READY", "INCOMPLETE"]
    interactionRevisionId: UUID
    connectivityNeedId: UUID
    requestId: UUID
    requesterActorId: UUID
    decisionId: UUID
    deciderActorId: UUID
    evaluationAt: str
    requestSubmittedAt: str
    decisionAt: str
    sourceAddressKind: Literal["HOST", "PREFIX"] | None
    destinationAddressKind: Literal["HOST", "PREFIX"] | None


class Export(Strict):
    evaluationAt: str
    selectedRuleId: UUID
    rows: list[PolicyRow]


def create_app(db, credentials):
    """Explicit local profile: no global app, auto-seed, or default credentials."""
    app = FastAPI(title="NAPMS local development API", version="0.1.0")
    service = Service(db)
    app.state.service = service
    bearer = HTTPBearer(auto_error=False)

    @app.middleware("http")
    async def protected_cache(request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/access-requests") or request.url.path.endswith("/access-request-options"):
            response.headers["Cache-Control"] = "no-store"
        return response

    def actor(credential: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        if credential and credential.scheme.lower() == "bearer":
            for token, actor_id in credentials.items():
                if secrets.compare_digest(credential.credentials, token):
                    return actor_id
        raise Problem(401, "UNAUTHENTICATED", "Valid bearer credential required")

    Actor = Annotated[str, Depends(actor)]

    @app.exception_handler(Problem)
    async def problem_handler(request: Request, error: Problem):
        return JSONResponse(status_code=error.status,
                            content={"error": {"code": error.code, "message": error.message}},
                            headers={"WWW-Authenticate": "Bearer"} if error.status == 401 else None)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, error: RequestValidationError):
        # Never echo caller values (which may contain credentials) in validation responses.
        return JSONResponse(status_code=422, content={"error": {"code": "INVALID_INPUT", "message": "Malformed or unsupported input"}})

    def no_query(request: Request):
        if request.query_params:
            raise Problem(422, "INVALID_INPUT", "Unsupported query parameters")

    @app.post("/business-processes", status_code=201, response_model=BusinessProcess, dependencies=[Depends(no_query)])
    def create_process(data: ProcessInput, who: Actor):
        return service.create_process(who, data.model_dump())

    @app.get("/business-processes", response_model=ProcessCollection)
    def list_processes(who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.list_processes(who, query.limit, query.offset)

    @app.get("/business-processes/{processId}", response_model=BusinessProcess, dependencies=[Depends(no_query)])
    def get_process(processId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.process(who, str(processId))

    @app.get("/business-processes/{processId}/needs", response_model=NeedCollection)
    def needs(processId: UUID, who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.needs(who, str(processId), query.limit, query.offset)

    @app.get("/business-processes/{processId}/need-options", response_model=NeedOptions)
    def need_options(processId: UUID, who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.needs(who, str(processId), query.limit, query.offset, options=True)

    @app.post("/business-processes/{processId}/needs", status_code=201, response_model=Need, dependencies=[Depends(no_query)])
    def create_need(processId: UUID, data: NeedInput, who: Actor):
        return service.create_need(who, str(processId), str(data.interactionRevisionId))

    def unique_options_query(request: Request):
        keys = [key for key, _ in request.query_params.multi_items()]
        if len(keys) != len(set(keys)):
            raise Problem(422, "INVALID_INPUT", "Malformed or unsupported input")

    @app.get("/business-processes/{processId}/needs/{connectivityNeedId}/access-request-options",
             response_model=RevisionOptions | DeploymentOptions, dependencies=[Depends(unique_options_query)])
    def request_options(processId: UUID, connectivityNeedId: UUID, who: Actor, query: Annotated[OptionsQuery, Query()]):
        return service.request_options(who, str(processId), str(connectivityNeedId), query.kind,
                                       str(query.interactionRevisionId) if query.interactionRevisionId else None, query.limit, query.offset)

    @app.post("/access-requests", status_code=201, response_model=AccessRequest, dependencies=[Depends(no_query)])
    def submit(data: AccessInput, who: Actor):
        return service.submit(who, data.model_dump(mode="json"))

    @app.get("/access-requests/{requestId}", response_model=AccessRequest, dependencies=[Depends(no_query)])
    def get_request(requestId: UUID, who: Actor):
        return service.request(who, str(requestId))

    @app.get("/access-requests", response_model=RequestCollection)
    def list_requests(who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.list_requests(who, query.limit, query.offset)

    @app.post("/access-requests/{requestId}/decision", status_code=201, response_model=Decision, dependencies=[Depends(no_query)])
    def decide(requestId: UUID, data: DecisionInput, who: Actor):
        return service.decide(who, str(requestId), data.outcome)

    @app.get("/policy-rules/{ruleId}", response_model=Rule, dependencies=[Depends(no_query)])
    def get_rule(ruleId: UUID, who: Actor):
        return service.rule(who, str(ruleId))

    @app.get("/policy/export", response_model=Export,
             responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}})
    def export(who: Actor, query: Annotated[ExportQuery, Query()]):
        result = service.export(who, str(query.ruleId))
        if query.format == "json":
            return result
        output = io.StringIO(newline="")
        writer = csv.DictWriter(output, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(result["rows"])
        return Response(output.getvalue(), media_type="text/csv", headers={
            "X-Evaluation-At": result["evaluationAt"], "X-Selected-Rule-Id": result["selectedRuleId"]})

    return app
