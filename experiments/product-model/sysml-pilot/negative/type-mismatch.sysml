package TypeMismatch {
    private import ScalarValues::*;

    action def Broken {
        in label : String;
        in count : Integer;
        bind count = label;
    }
}
