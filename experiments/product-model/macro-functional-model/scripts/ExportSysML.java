import java.nio.file.Files;
import java.nio.file.Path;
import org.omg.sysml.interactive.SysMLInteractive;

public class ExportSysML {
    public static void main(String[] args) throws Exception {
        if (args.length != 4) {
            throw new IllegalArgumentException("usage: ExportSysML MODEL LIBRARY PACKAGE OUTPUT");
        }
        SysMLInteractive interactive = SysMLInteractive.createInstance();
        interactive.loadLibrary(args[1]);
        String source = Files.readString(Path.of(args[0]));
        var result = interactive.process(source, true);
        if (result.getException() != null) throw result.getException();
        if (result.hasErrors()) throw new IllegalStateException(result.formatIssues());
        Object json = interactive.show("--style=JSON " + args[2]);
        Files.writeString(Path.of(args[3]), json.toString());
    }
}
