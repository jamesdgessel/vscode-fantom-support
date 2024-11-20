using concurrent

class DocBuilder 
{

    static [sys::Str:sys::Obj?]? methodBuilder(Method method) {
        
        if (method.name.contains("\$")) return null// skip inner classes
        // else echo("  method ${method.name}")
        methodData := 
        [
            "name": method.name,
            // "params": method.params.map |param| {[ 
            //     "name": param.name,
            //     "type": param.toStr
            // ]},
            // "doc": method.doc ?: ""
        ]
        return methodData
    }

    static [sys::Str:sys::Obj?]? fieldBuilder(Field field) {
        // echo("  field ${field.name}")
        fieldData := 
        [
            "name": field.name,
            // "type": field.toStr,
            // "doc": field.doc ?: ""
        ]
        return fieldData
    }

    static [sys::Str:sys::Obj?]? classBuilder(Type type) {
        
        if (type.name.contains("\$")) return null  // skip inner classes
        // else echo(" class ${type.name}")

        fields := type.fields.map |field| {fieldBuilder(field)}
        methods := type.methods.map |method| {methodBuilder(method)}
        classData := 
        [
            "name": type.name,
            // "doc": type.doc ?: "",
            // "facets" : (type.facets.map |facet| {facet.toStr}).join(", "),
            // "base" : type.base.toStr,
            // "public": type.isPublic,
            "fields": fields.join(", "),
            "methods": methods.join(", ")
        ]
        return classData
    }

    static [sys::Str:sys::Obj?]? podBuilder(Pod pod) {
        echo("  -- generating ${pod.toStr} docs -- ")
        classes := pod.types.map |type| {classBuilder(type)}
        podData := [
            "name": pod.toStr,
            "type": "pod",
            "classes": classes
        ]
        return podData
    }

    static Void buildDocs() {

        //build file 
        file := File("docs/fantom-docs.json".toUri)
        json := util::JsonOutStream(file.out)
        json.prettyPrint = true 

        //get pods, loop 
        echo("Building docs")
        docs := Pod.list.getRange(1..2).map |Pod pod -> [sys::Str:sys::Obj?]| { return podBuilder(pod) }
        echo("Docs built as [$docs.typeof]")

        //close stream and write to file
        file.out.printLine(docs.toStr).close
        // json.writeJson(docs as Obj?[])
        // json.close
        // echo("Docs written to ${file.path}")
    }

    static Void main() { buildDocs() }
}
