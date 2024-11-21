using concurrent

class DocLookup {

    static Str main(Str[] args) {
        if (args.isEmpty) {
            return "No type name provided."
        }

        Str? given := args[0]
        // echo("Looking for type: $given")

        Type? found:= null
        pods:= Pod.list
        for (i:=0; i<pods.size; ++i)
        {
            try 
            {
                found= pods[i].type(given)
                echo("**${pods[i].name}**::$found.name\n\n")
                echo(found.doc)
                echo("\n")
                Str[] types := found.slots.map |r| 
                { 
                    echo(r.name+"\n")
                    return r.name 
                }
                break
            }
            catch 
            {
                // echo("Type '$given' not found in pod '${pods[i].name}'")
                continue   
            }
        }

        return "done"
    }
}
