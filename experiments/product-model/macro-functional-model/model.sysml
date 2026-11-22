package NapmsMacroFunctionalModel {
    private import ScalarValues::*;
    private import AccessRequestModel::*;

    part def ConnectivityContext {
        attribute sourceDeploymentId : String;
        attribute destinationDeploymentId : String;
        attribute interactionRevisionId : String;
        attribute connectivityNeedId : String;
    }

    part def AuthorityEvidence {
        attribute actorId : String;
        attribute actionKind : String;
        attribute scopeId : String;
        attribute evaluatedAt : String;
        attribute admitted : Boolean;
    }

    part def AccessDecisionEvidence {
        part request : AccessRequest;
        part decision : RequestDecision;
        attribute decisionActorId : String;
    }

    part def EffectivePolicy {
        part accessSubject : AccessSubject;
        attribute ruleId : String;
        attribute active : Boolean;
    }

    part def PolicyExportSelection {
        attribute ruleId : String;
        attribute requestedFormat : String;
    }

    part def PolicyExportResult {
        attribute evaluationAt : String;
        attribute readiness : String;
        attribute rowCount : Integer;
    }

    action def EstablishConnectivityContext {
        in context : ConnectivityContext;
        out establishedContext : ConnectivityContext;
    }

    action def AdmitAccessRequest {
        in context : ConnectivityContext;
        in requestData : AccessRequestData;
        in sourceAuthority : AuthorityEvidence;
        out admittedRequest : AccessRequest;
        out admissionEvidence : AdmissionEvidence;
    }

    action def DecideAndMaintainPolicy {
        in request : AccessRequest;
        in decision : RequestDecision;
        in decisionAuthority : AuthorityEvidence;
        out decisionEvidence : AccessDecisionEvidence;
        out effectivePolicy : EffectivePolicy[0..1];
    }

    action def EvaluateDesiredPolicy {
        in selection : PolicyExportSelection;
        in exportAuthority : AuthorityEvidence;
        in effectivePolicy : EffectivePolicy[0..1];
        out exportResult : PolicyExportResult;
    }

    action def NAPMSMacroFunctions {
        in connectivityContext : ConnectivityContext;
        in requestData : AccessRequestData;
        in request : AccessRequest;
        in decision : RequestDecision;
        in requestAuthority : AuthorityEvidence;
        in decisionAuthority : AuthorityEvidence;
        in exportAuthority : AuthorityEvidence;
        in selection : PolicyExportSelection;
        in effectivePolicy : EffectivePolicy[0..1];
        out admittedRequest : AccessRequest;
        out decisionEvidence : AccessDecisionEvidence;
        out exportResult : PolicyExportResult;

        action establishContext : EstablishConnectivityContext;
        action admitRequest : AdmitAccessRequest;
        action decidePolicy : DecideAndMaintainPolicy;
        action evaluatePolicy : EvaluateDesiredPolicy;

        bind establishContext.context = connectivityContext;
        bind admitRequest.context = establishContext.establishedContext;
        bind admitRequest.requestData = requestData;
        bind admitRequest.sourceAuthority = requestAuthority;
        bind admittedRequest = admitRequest.admittedRequest;
        bind decidePolicy.request = request;
        bind decidePolicy.decision = decision;
        bind decidePolicy.decisionAuthority = decisionAuthority;
        bind decisionEvidence = decidePolicy.decisionEvidence;
        bind evaluatePolicy.selection = selection;
        bind evaluatePolicy.exportAuthority = exportAuthority;
        bind evaluatePolicy.effectivePolicy = effectivePolicy;
        bind exportResult = evaluatePolicy.exportResult;
    }
}
