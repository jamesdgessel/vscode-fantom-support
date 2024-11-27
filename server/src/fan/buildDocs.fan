using concurrent
using util
using concurrent::Actor
using concurrent::ActorPool
using concurrent::Future

class DocBuilder 
{
    static Bool debug() {return false}

    static [sys::Str:sys::Obj?]? methodBuilder(Method method) {
        if (method.name.contains("\$")) return null // skip inner classes

        try {
            methodData := 
            [
                "name": method.name,
                "qname": method.qname,
                "signature":method.signature,
                "type": "method",
                "params": method.params.map |param| 
                {[
                    "name": param.name,
                    "type": param.toStr
                ]},
                "doc": method.doc ?: "",
                "returns": method.returns.toStr,
            ]
            return methodData
        } catch (Err e) {
            echo("Error in methodBuilder for method ${method.name}: ${e.toStr}") // Leave unchanged
            return null
        }
    }

    static [sys::Str:sys::Obj?]? fieldBuilder(Field field) {
        // echo("  field ${field.name}")
        fieldData := 
        [
            "name": field.name,
            "qname": field.qname,
            "signature": field.signature,
            "type": "field",
            "doc": field.doc ?: ""
        ]
        return fieldData
    }

    static [sys::Str:sys::Obj?]? classBuilder(Type type) {
        
        if (type.name.contains("\$")) return null  // skip inner classes

        fields := type.fields.map |field| {fieldBuilder(field)}
        methods := type.methods.map |method| {methodBuilder(method)}
        classData := 
        [
            "name": type.name,
            "qname": type.qname,
            "type": "class",
            "doc": type.doc ?: "",
            "facets" : (type.facets.map |fac| {fac.toStr}),
            "public": type.isPublic,
            "fields": fields,
            "methods": methods
        ]
        return classData
    }

    static [sys::Str:sys::Obj?]? podBuilder(Pod pod) {
        if (debug()) echo("  -- generating ${pod.toStr} docs -- ")
        classes := pod.types.map |type| {classBuilder(type)}
        podData := [
            "name": pod.toStr,
            "type": "pod",
            "qname": "Pod::$pod.toStr",
            "classes": classes
        ]
        return podData
    }

    static Obj?[] docBuilder() {

        //build docs
        pods := Pod.list
        docs := pods.map |Pod pod -> [sys::Str:sys::Obj?]?| { 
            return podBuilder(pod) 
            }
        
        return docs

    }

    static Void buildDocs(Str outPath) {
        if (debug()) echo("[start] building docs")
        try {
            docs := docBuilder() 

            //build dir if it doesn't exist


            //build file 
            file := File(outPath.toUri)
            json := util::JsonOutStream(file.out)
            json.prettyPrint = true 

            //close stream and write to file
            json.writeJson(docs as Obj?[])
            json.close
            if (debug()) echo("[done] docs written to ${file.osPath}")
        } catch (Err e) {
            echo("[error] Failed to build docs: ${e.toStr}") // Leave unchanged
        }
    }

    static Future buildDocsAsync(Str outPath) {
        if (debug()) echo("starting async build")
        pool := ActorPool()
        a := Actor(pool) |Obj msg| { 
            try {
                buildDocs(outPath)
            } catch (Err e) {
                echo("Async buildDocs error: ${e.toStr}") // Leave unchanged
            }
        }
        if (debug()) echo("starting async build")
        return a.send("start")
    }

    static [Str:Obj?]? reduceToNavTree([Str:Obj?]? json) 
    {
        Str[] keepKeys := ["name", "type", "qname", "public","returns"]
        Str[] iterateKeys := ["classes", "methods", "fields"]
        tree := json.mapNotNull |v,k|  
        { 
            if (v == null ) { return null }
            else if (iterateKeys.contains(k)) 
            {
                return (v as List).mapNotNull |p| 
                {
                    if (p == null) return null
                    return reduceToNavTree(p as [Str:Obj?] )
                }
            }
            else if(!keepKeys.contains(k)) { return null}
            else  { return v }
        }

        return tree
    }

    // static Void buildNavTree(Str outPath)
    // {
    //     if (debug()) echo("building nav tree")
        
    //     //parse json
    //     file := File(outPath.toUri)
    //     instream := util::JsonInStream(file.in)
    //     json := instream.readJson

    //     navTree := (json as List).mapNotNull |p| 
    //     {
    //         if (p == null) return null
    //         return reduceToNavTree(p as [Str:Obj?] )
    //     }

    //     outPath = outPath.replace(".json", "-nav.json")
    //     outFile := File(outPath.toUri)
    //     jsonOut := util::JsonOutStream(outFile.out)
    //     jsonOut.prettyPrint = true
    //     jsonOut.writeJson(navTree as Obj?[])
    //     jsonOut.close

    // }

    static Void main(Str[] args) 
    { 
        if (args.size < 1) {
            echo("Usage: buildDocs <outPath>")
            return
        }
        Str outPath := args[0]

        if (!outPath.endsWith(".json")) {
            outPath = (outPath+"/fantom-docs.json").replace("\\","/")
        } 
        echo(outPath)
        return 

        fut := buildDocsAsync(outPath).get

        // buildNavTree(outPath) 

        if (debug()) echo("done")
        
        Str outStr := outPath
        echo(outStr)
    }
}
