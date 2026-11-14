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


class NameInput(Strict):
    name: str = Field(strict=True, min_length=1, max_length=300)


class Application(Strict):
    applicationId: UUID
    name: str


class ApplicationCollection(Strict):
    items: list[Application]
    limit: int
    offset: int
    hasMore: bool


class Component(Strict):
    componentId: UUID
    applicationId: UUID
    applicationName: str
    name: str


class ComponentCollection(Strict):
    items: list[Component]
    limit: int
    offset: int
    hasMore: bool


class InteractionRevision(Strict):
    interactionRevisionId: UUID
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int
    destinationPortEnd: int
    trafficLabel: str


class Interaction(Strict):
    interactionId: UUID
    applicationId: UUID
    applicationName: str
    sourceComponentId: UUID
    sourceComponentName: str
    destinationComponentId: UUID
    destinationComponentName: str
    revisions: list[InteractionRevision]


class InteractionCollection(Strict):
    items: list[Interaction]
    limit: int
    offset: int
    hasMore: bool


class Resource(Strict):
    resourceId: UUID
    name: str


class ResourceCollection(Strict):
    items: list[Resource]
    limit: int
    offset: int
    hasMore: bool


class ResourceEndpointInput(Strict):
    kind: Literal["HOST", "PREFIX"]
    address: str = Field(strict=True, min_length=1, max_length=64)


class ResourceEndpoint(Strict):
    endpointId: UUID
    resourceId: UUID
    address: str | None
    kind: Literal["HOST", "PREFIX"] | None


class DeploymentInput(Strict):
    componentId: UUID
    resourceId: UUID


class ComponentDeployment(Strict):
    deploymentId: UUID
    componentId: UUID
    componentName: str
    applicationId: UUID
    applicationName: str
    resourceId: UUID
    resourceName: str


class DeploymentCollection(Strict):
    items: list[ComponentDeployment]
    limit: int
    offset: int
    hasMore: bool


class InteractionInput(Strict):
    sourceComponentId: UUID
    destinationComponentId: UUID
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int = Field(strict=True, ge=1, le=65535)
    destinationPortEnd: int = Field(strict=True, ge=1, le=65535)

    @model_validator(mode="after")
    def ordered_ports(self):
        if self.destinationPortStart > self.destinationPortEnd:
            raise ValueError("Invalid destination port range")
        return self


class NeedInput(Strict):
    interactionRevisionId: UUID


class Need(Strict):
    displayLabel: str
    connectivityNeedId: UUID
    processId: UUID
    interactionId: UUID
    componentId: UUID


class NeedOption(Strict):
    trafficLabel: str
    displayLabel: str
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
    displayLabel: str
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


class CurrentExportQuery(Strict):
    format: Literal["json", "csv"] = "json"


class ExportQuery(Strict):
    ruleId: UUID
    format: Literal["json", "csv"] = "json"


class Admission(Strict):
    sourceResourceId: UUID
    grantId: UUID
    checkedAt: str


class Decision(Strict):
    displayLabel: str
    decisionId: UUID
    requestId: UUID
    outcome: Literal["ALLOWED", "DENIED"]
    deciderActorId: UUID
    decidedAt: str
    policyRuleId: UUID | None


class AccessRequest(Strict):
    displayLabel: str
    listLabel: str
    listContext: str
    requesterDisplayName: str
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
    participantsLabel: str
    applicationLabel: str
    sourceResourceLabel: str
    destinationResourceLabel: str
    trafficLabel: str
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int
    destinationPortEnd: int
    displayLabel: str
    ruleId: UUID
    subjectId: UUID
    state: Literal["ACTIVE", "INACTIVE"]
    subject: dict[str, UUID]
    originatingDecision: Decision
    originatingRequest: AccessRequest
    connectivityNeedId: UUID
    allowances: list[Decision]


class RuleSummary(Strict):
    participantsLabel: str
    applicationLabel: str
    sourceResourceLabel: str
    destinationResourceLabel: str
    ruleId: UUID
    subjectId: UUID
    state: Literal["ACTIVE", "INACTIVE"]
    displayLabel: str
    subject: Subject
    sourceResourceId: UUID
    destinationResourceId: UUID
    ipProtocol: Literal["TCP", "UDP"]
    destinationPortStart: int
    destinationPortEnd: int
    trafficLabel: str
    originatingDecisionId: UUID
    allowanceDecisionIds: list[UUID]


class RuleCollection(Strict):
    items: list[RuleSummary]
    limit: int
    offset: int
    hasMore: bool


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


class CurrentExport(Strict):
    scope: Literal["authorized"]
    evaluationAt: str
    rows: list[PolicyRow]


def csv_export(result, headers):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(result["rows"])
    return Response(output.getvalue(), media_type="text/csv", headers={"X-Evaluation-At": result["evaluationAt"], **headers})


def create_app(db, credentials, *, shared_read=False):
    """Explicit local profile: no global app, auto-seed, or default credentials."""
    app = FastAPI(title="NAPMS local development API", version="0.1.0")
    service = Service(db, shared_read=shared_read)
    app.state.service = service
    bearer = HTTPBearer(auto_error=False)

    @app.middleware("http")
    async def protected_cache(request, call_next):
        response = await call_next(request)
        if request.url.path.startswith(("/access-requests", "/policy-rules", "/policy/export", "/applications", "/deployments", "/resources")) or request.url.path.endswith("/access-request-options"):
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

    @app.post("/applications", status_code=201, response_model=Application, dependencies=[Depends(no_query)])
    def create_application(data: NameInput, who: Actor):
        return service.create_application(who, data.name)

    @app.get("/applications", response_model=ApplicationCollection)
    def list_applications(who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.applications(who, query.limit, query.offset)

    @app.get("/applications/{applicationId}", response_model=Application, dependencies=[Depends(no_query)])
    def get_application(applicationId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.application(who, str(applicationId))

    @app.post("/applications/{applicationId}/components", status_code=201, response_model=Component, dependencies=[Depends(no_query)])
    def create_component(applicationId: UUID, data: NameInput, who: Actor):
        return service.create_component(who, str(applicationId), data.name)

    @app.get("/applications/{applicationId}/components", response_model=ComponentCollection)
    def list_components(applicationId: UUID, who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.components(who, str(applicationId), query.limit, query.offset)

    @app.get("/applications/{applicationId}/components/{componentId}", response_model=Component, dependencies=[Depends(no_query)])
    def get_component(applicationId: UUID, componentId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.component(who, str(applicationId), str(componentId))

    @app.post("/applications/{applicationId}/interactions", status_code=201, response_model=Interaction, dependencies=[Depends(no_query)])
    def create_interaction(applicationId: UUID, data: InteractionInput, who: Actor):
        return service.create_interaction(who, str(applicationId), data.model_dump(mode="json"))

    @app.get("/applications/{applicationId}/interactions", response_model=InteractionCollection)
    def list_interactions(applicationId: UUID, who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.interactions(who, str(applicationId), query.limit, query.offset)

    @app.get("/applications/{applicationId}/interactions/{interactionId}", response_model=Interaction, dependencies=[Depends(no_query)])
    def get_interaction(applicationId: UUID, interactionId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.interaction(who, str(applicationId), str(interactionId))

    @app.post("/deployments", status_code=201, response_model=ComponentDeployment, dependencies=[Depends(no_query)])
    def create_deployment(data: DeploymentInput, who: Actor):
        return service.create_deployment(who, str(data.componentId), str(data.resourceId))

    @app.get("/deployments", response_model=DeploymentCollection)
    def list_deployments(who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.deployments(who, query.limit, query.offset)

    @app.get("/deployments/{deploymentId}", response_model=ComponentDeployment, dependencies=[Depends(no_query)])
    def get_deployment(deploymentId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.deployment(who, str(deploymentId))

    @app.get("/resources", response_model=ResourceCollection)
    def list_resources(who: Actor, query: Annotated[ListQuery, Query()], response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.resources(who, query.limit, query.offset)

    @app.post("/resources", status_code=201, response_model=Resource, dependencies=[Depends(no_query)])
    def create_resource(data: NameInput, who: Actor):
        return service.create_resource(who, data.name)

    @app.get("/resources/{resourceId}", response_model=Resource, dependencies=[Depends(no_query)])
    def get_resource(resourceId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.resource(who, str(resourceId))

    @app.get("/resources/{resourceId}/endpoint", response_model=ResourceEndpoint, dependencies=[Depends(no_query)])
    def get_resource_endpoint(resourceId: UUID, who: Actor, response: Response):
        response.headers["Cache-Control"] = "no-store"
        return service.resource_endpoint(who, str(resourceId))

    @app.put("/resources/{resourceId}/endpoint", response_model=ResourceEndpoint, dependencies=[Depends(no_query)])
    def set_resource_endpoint(resourceId: UUID, data: ResourceEndpointInput, who: Actor):
        return service.set_resource_endpoint(who, str(resourceId), data.kind, data.address)

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

    @app.get("/policy-rules", response_model=RuleCollection, dependencies=[Depends(unique_options_query)])
    def list_rules(who: Actor, query: Annotated[ListQuery, Query()]):
        return service.list_rules(who, query.limit, query.offset)

    @app.get("/policy/export/current", response_model=CurrentExport, dependencies=[Depends(unique_options_query)],
             responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}})
    def export_current(who: Actor, query: Annotated[CurrentExportQuery, Query()], response: Response):
        result = service.export_current(who)
        response.headers["X-Policy-Scope"] = "authorized"
        response.headers["X-Evaluation-At"] = result["evaluationAt"]
        if query.format == "json":
            return result
        return csv_export(result, {"X-Policy-Scope": "authorized"})

    @app.get("/policy-rules/{ruleId}", response_model=Rule, dependencies=[Depends(no_query)])
    def get_rule(ruleId: UUID, who: Actor):
        return service.rule(who, str(ruleId))

    @app.get("/policy/export", response_model=Export,
             responses={200: {"content": {"text/csv": {"schema": {"type": "string"}}}}})
    def export(who: Actor, query: Annotated[ExportQuery, Query()]):
        result = service.export(who, str(query.ruleId))
        if query.format == "json":
            return result
        return csv_export(result, {"X-Selected-Rule-Id": result["selectedRuleId"]})

    return app
