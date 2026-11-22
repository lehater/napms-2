package AccessRequestModel {
    private import ScalarValues::*;

    part def AccessSubject {
        attribute sourceDeploymentId : String;
        attribute destinationDeploymentId : String;
        attribute interactionRevisionId : String;
    }

    part def AccessRequest {
        attribute requestId : String;
        attribute status : String;
        part requestSubject : AccessSubject;

        assert constraint terminalStatus {
            status == "PENDING" or status == "ALLOWED" or status == "DENIED"
        }
    }

    part def AdmissionEvidence {
        attribute sourceGrantEffective : Boolean;
    }

    part def RequestDecision {
        attribute outcome : String;
    }

    action def CheckRequestSemantics {
        in request : AccessRequest;
        out semanticsValid : Boolean;
    }

    action def CheckSourceAdmission {
        in request : AccessRequest;
        out evidence : AdmissionEvidence;
        out admitted : Boolean;
    }

    action def PrepareRequest {
        in request : AccessRequest;
        out prepared : AccessRequest;
        out admissionEvidence : AdmissionEvidence;
        out admitted : Boolean;
        out semanticsValid : Boolean;
        action checkSemantics : CheckRequestSemantics;
        action checkAdmission : CheckSourceAdmission;
        bind checkSemantics.request = request;
        bind checkAdmission.request = request;
        bind semanticsValid = checkSemantics.semanticsValid;
        bind admissionEvidence = checkAdmission.evidence;
        bind admitted = checkAdmission.admitted;
        first checkSemantics then checkAdmission;
    }

    action def RegisterRequest {
        in request : AccessRequest;
        in admissionEvidence : AdmissionEvidence;
        in admitted : Boolean;
        in semanticsValid : Boolean;
        out registered : AccessRequest;

        assert constraint onlyRegisterValidAdmittedRequest {
            admissionEvidence.sourceGrantEffective and admitted and semanticsValid and registered.status == "PENDING"
        }
    }

    action def RecordPendingRequest {
        in request : AccessRequest;
        out registered : AccessRequest;
        action prepare : PrepareRequest;
        action record : RegisterRequest;
        bind prepare.request = request;
        bind record.request = request;
        bind record.admissionEvidence = prepare.admissionEvidence;
        bind record.admitted = prepare.admitted;
        bind record.semanticsValid = prepare.semanticsValid;
        first prepare then record;
    }

    action def AdmitAndRegister {
        in request : AccessRequest;
        out registered : AccessRequest;
        action recordRequest : RecordPendingRequest;
        bind recordRequest.request = request;
    }

    action def DecideRequest {
        in request : AccessRequest;
        in decision : RequestDecision;
        out decided : AccessRequest;

        assert constraint decisionHasTerminalOutcome {
            decision.outcome == "ALLOWED" or decision.outcome == "DENIED"
        }
    }

    action def SubmitAndDecide {
        in request : AccessRequest;
        in decision : RequestDecision;
        in admissionEvidence : AdmissionEvidence;
        in semanticsValid : Boolean;
        out result : AccessRequest;
        action submit : RecordPendingRequest;
        action applyDecision : DecideRequest;
        bind submit.request = request;
        bind applyDecision.request = submit.registered;
        bind applyDecision.decision = decision;
        first submit then applyDecision;
    }

    constraint def RegistrationRequiresAdmission {
        in admitted : Boolean;
        in semanticsValid : Boolean;
        admitted and semanticsValid
    }

    constraint def DeniedRequestCannotBeRegistered {
        in admitted : Boolean;
        in registered : Boolean;
        registered implies admitted
    }
}
