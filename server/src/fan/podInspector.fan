using util

class PodInspector {

    const static Bool debug := false

    static Void log(Str message) {
        if (PodInspector.debug) echo(message)
    }

    Obj?[] inspectAllPods() {
        PodInspector.log("Inspecting all pods...")
        return Pod.list.map |pod| { InspectPod(pod) }
    }

    Void writeDocs(File file) {
        try {
            docs := inspectAllPods()
            jsonOut := JsonOutStream(file.out)
            jsonOut.prettyPrint = true
            jsonOut.writeJson(docs as Obj?[])
            jsonOut.close
            echo("Documentation written to ${file.osPath}")
        } catch (Err e) {
            echo("[Error] Failed to write documentation: ${e.toStr}")
        }
    }

    static Void main(Str[] args) {
        inspector := PodInspector { it.debug = true }
        home := Env.cur.homeDir 
        outDir := home.createDir("jsonDocs")
        outFile := File((outDir.toStr+File.pathSep+"docs.json").toUri)
        inspector.writeDocs(outFile)
    }
}

class InspectPod {

    Str name
    InspectClass[] classes

    new make(Pod pod) 
    { 
        this.name = pod.name
        this.classes = pod.types.map |Type type -> InspectClass| { InspectClass.make(type) }
    }

    [Str:Obj?]? getDocs(Pod pod) {
        PodInspector.log("Inspecting pod: ${pod.name}")
        try {
            classDocs := pod.types.map |type| { InspectClass(type as Type) }
            return [
                "name": pod.name,
                "qname": "Pod::${pod.name}",
                "type": "pod",
                "classes": classDocs
            ]
        } catch (Err e) {
            echo("[Error] Failed to inspect pod ${pod.name}: ${e.toStr}")
            return null
        }
    }
}

class InspectClass : InspectType {

    Str[] facets
    InspectMethod[] methods
    InspectField[] fields

    new make(Type type) 
    { 
        PodInspector.log("    Inspecting field: ${type.name}")
        super.make(type) 

        this.facets = type.facets.map |fac| { fac.toStr }
        this.methods = type.methods.map |method| { InspectMethod.make(method as Type) }
        this.fields = type.fields.map |field| { InspectField.make(field as Type) }

    }

    [Str:Obj?]? getDocs() {
        try {
            return [
                "qname": this.qname,
                "doc": this.doc ?: "",
                "facets": this.facets.map |fac| {fac.toStr},
                "fields": this.fields.map |field| {field.getDocs()},
                "methods": this.methods.map |method| {method.getDocs()},
            ]
        } catch (Err e) {
            echo("[Error] Failed to inspect class ${this.name}: ${e.toStr}")
            return null
        }
    }

    [Str:Obj?]? getNav() {
        super.buildNav(this.name, this.typeof, this.base)
    }
}

class InspectMethod : InspectType {

    Str signature 
    Str[] params
    Str[] facets
    Str returns

    new make(Type type) 
    { 
        PodInspector.log("    Inspecting field: ${type.name}")
        super.make(type) 

        this.signature = type.signature
        this.facets = type.facets.map |fac| { fac.toStr }
        this.params = type.params.map |param| { ["name": param.name, "type": param.toStr] }


    }

    [Str:Obj?]? getDocs() {
        try {
            return [
                "qname": this.qname,
                "doc": this.doc ?: "",
                "facets": this.facets.map |fac| {fac.toStr},
                "signature": this.signature,
                "params": this.params,
                "returns": this.returns.toStr
            ]
        } catch (Err e) {
            echo("[Error] Failed to inspect field ${this.name}: ${e.toStr}")
            return null
        }
    }

    [Str:Obj?]? getNav() {
        super.buildNav(this.name, this.typeof, this.signature)
    }
}

class InspectField : InspectType {

    Str signature
    Str[] facets

    new make(Type type) 
    { 
        PodInspector.log("    Inspecting field: ${type.name}")
        super.make(type) 

        this.signature = type.signature
        this.facets = type.facets.map |fac| { fac.toStr }

    }

    [Str:Obj?]? getDocs() {
        try {
            return [
                "qname": this.qname,
                "doc": this.doc ?: "",
                "facets": this.facets.map |fac| {fac.toStr},
                "signature": this.signature
            ]
        } catch (Err e) {
            echo("[Error] Failed to inspect field ${this.name}: ${e.toStr}")
            return null
        }
    }

    [Str:Obj?]? getNav() {
        return super.buildNav(this.name, this.istype, this.signature)
    }
}

public class InspectType {

    Type type
    Str name
    Str qname
    
    Str doc

    Str istype
    Str base
    Str[] inheritance

    Bool isPublic
    Bool isInternal
    

    new make(Type type) 
    { 
        this.type = type
        this.name = type.name
        this.qname = type.qname

        this.doc = type.doc

        this.istype = type.typeof.toStr
        this.base = type.base.toStr
        this.inheritance = type.inheritance.map |t| { t.toStr }

        this.isPublic = type.isPublic
        this.isInternal = type.isInternal

    }

    virtual [Str:Obj?]? buildNav(Str? main, Str? detail, Str? tooltip) {
        try 
        {
            return [
                "main": main!==null ? main : this.name,
                "detail": detail!==null ? detail : this.typeof,
                "tooltip": tooltip!==null ? tooltip : this.qname,
            ]
        } catch (Err e) 
        {
            PodInspector.log("[Error] Failed to inspect field ${type.name}: ${e.toStr}")
            return null
        }
    }


}
