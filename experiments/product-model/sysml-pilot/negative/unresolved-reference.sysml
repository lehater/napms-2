package UnresolvedReference {
    private import ScalarValues::*;

    action def Broken {
        in request : MissingRequest;
    }
}
