package AccessRequestModel {
    private import ScalarValues::*;

    part def AccessSubject {
        attribute sourceDeploymentId : String;
        attribute destinationDeploymentId : String;
        attribute interactionRevisionId : String;
    }

    part def AccessRequestData {
        part requestSubject : AccessSubject;
        attribute connectivityNeedId : String;
    }

    attribute def RequestStatus :> String;

    part def RequestDecision {
        attribute outcome : String;
    }

    state def AccessRequestLifecycle {
        state PENDING;
        state ALLOWED;
        state DENIED;

        entry; then PENDING;

        transition first PENDING
            accept decision : RequestDecision
            if decision.outcome == "ALLOWED"
            then ALLOWED;

        transition first PENDING
            accept decision : RequestDecision
            if decision.outcome == "DENIED"
            then DENIED;
    }

    part def AccessRequest {
        attribute requestId : String;
        attribute status : RequestStatus;
        part requestSubject : AccessSubject;
        attribute connectivityNeedId : String;
        state lifecycle : AccessRequestLifecycle;

        assert constraint statusIsLifecycleValue {
            status == "PENDING" or status == "ALLOWED" or status == "DENIED"
        }
    }

    part def AdmissionEvidence {
        attribute sourceGrantEffective : Boolean;
    }

    part def AccessRequestSubmissionResult {
        attribute admitted : Boolean;
        part registeredRequest : AccessRequest[0..1];
    }

    action def CheckRequestSemantics {
        in requestData : AccessRequestData;
        out semanticsValid : Boolean;
    }

    action def CheckSourceAdmission {
        in requestData : AccessRequestData;
        out evidence : AdmissionEvidence;
        out admitted : Boolean;
    }

    action def PrepareAccessRequest {
        in requestData : AccessRequestData;
        out admissionEvidence : AdmissionEvidence;
        out admitted : Boolean;
        out semanticsValid : Boolean;
        action checkSemantics : CheckRequestSemantics;
        action checkAdmission : CheckSourceAdmission;
        bind checkSemantics.requestData = requestData;
        bind checkAdmission.requestData = requestData;
        bind semanticsValid = checkSemantics.semanticsValid;
        bind admissionEvidence = checkAdmission.evidence;
        bind admitted = checkAdmission.admitted;
        first checkSemantics then checkAdmission;
    }

    action def RegisterAccessRequest {
        in requestData : AccessRequestData;
        in admissionEvidence : AdmissionEvidence;
        in admitted : Boolean;
        in semanticsValid : Boolean;
        out registeredRequest : AccessRequest;

        assert constraint registrationRequiresSuccessfulAdmission {
            admitted and admissionEvidence.sourceGrantEffective and semanticsValid and registeredRequest.status == "PENDING" and
                registeredRequest.requestSubject == requestData.requestSubject and
                registeredRequest.connectivityNeedId == requestData.connectivityNeedId
        }
    }

    action def RegisterAndDecideAccessRequest {
        in requestData : AccessRequestData;
        in admissionEvidence : AdmissionEvidence;
        in admitted : Boolean;
        in semanticsValid : Boolean;
        in decision : RequestDecision;
        out decidedRequest : AccessRequest;
        action register : RegisterAccessRequest;
        action applyDecision : DecideAccessRequest;
        bind register.requestData = requestData;
        bind register.admissionEvidence = admissionEvidence;
        bind register.admitted = admitted;
        bind register.semanticsValid = semanticsValid;
        bind applyDecision.request = register.registeredRequest;
        bind applyDecision.decision = decision;
        bind decidedRequest = applyDecision.decidedRequest;
        first register then applyDecision;
    }

    action def AdmitAndRegisterAccessRequest {
        in requestData : AccessRequestData;
        out result : AccessRequestSubmissionResult;
        action prepare : PrepareAccessRequest;
        action register : RegisterAccessRequest;
        action reject : RejectAccessRequest;
        bind prepare.requestData = requestData;
        bind result.admitted = prepare.admitted;
        bind register.requestData = requestData;
        bind register.admissionEvidence = prepare.admissionEvidence;
        bind register.admitted = prepare.admitted;
        bind register.semanticsValid = prepare.semanticsValid;
        bind result.registeredRequest = register.registeredRequest;
        bind reject.requestData = requestData;

        first start;
        then prepare;
        then decide admissionBranch;
            if prepare.admitted and prepare.semanticsValid then register;
            else reject;
    }

    action def RejectAccessRequest {
        in requestData : AccessRequestData;
        out rejected : Boolean;
    }

    action def DecideAccessRequest {
        in request : AccessRequest;
        in decision : RequestDecision;
        out decidedRequest : AccessRequest;

        assert constraint decisionHasTerminalOutcome {
            decision.outcome == "ALLOWED" or decision.outcome == "DENIED"
        }

        assert constraint decisionStatusMatchesOutcome {
            (decision.outcome == "ALLOWED" and decidedRequest.status == "ALLOWED") or
                (decision.outcome == "DENIED" and decidedRequest.status == "DENIED")
        }
    }

    action def SubmitAndDecideAccessRequest {
        in requestData : AccessRequestData;
        in decision : RequestDecision;
        out result : AccessRequestSubmissionResult;
        action prepare : PrepareAccessRequest;
        action registerAndDecide : RegisterAndDecideAccessRequest;
        action reject : RejectAccessRequest;
        bind prepare.requestData = requestData;
        bind result.admitted = prepare.admitted;
        bind registerAndDecide.requestData = requestData;
        bind registerAndDecide.admissionEvidence = prepare.admissionEvidence;
        bind registerAndDecide.admitted = prepare.admitted;
        bind registerAndDecide.semanticsValid = prepare.semanticsValid;
        bind registerAndDecide.decision = decision;
        bind result.registeredRequest = registerAndDecide.decidedRequest;
        bind reject.requestData = requestData;
        first start;
        then prepare;
        then decide admissionBranch;
            if prepare.admitted and prepare.semanticsValid then registerAndDecide;
            else reject;
    }
}
