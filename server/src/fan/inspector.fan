using concurrent

class Inspector {

    //log stuff
    static Void logitall(Str[] list, Str? prefix:="") { list.each |Str? str| { logit(prefix+str) }}
    static Void logit(Str logStr) { echo(logStr) ; return}
    static Str formatEcho(Str str, Int maxWidth) {
        Str truncated:= (str.size > maxWidth) ? str.getRange(0..maxWidth-3)+"..." :str
        return truncated.padr(maxWidth+1)
    }

    //parse info
    static Type[] podClasses(Pod pod) {return pod.types}
    static Str podInfo(Pod pod) {return pod.name}

    static Slot[] classSlots(Type type) {return type.slots}
    static Str classInfo(Type type) {
        
        Str full:= type.qname
        Str t:= type.isPublic ? "PUBLIC" : ""
        Str par:= type.name
        Type? curpar:= type
        while (curpar!=null) {
            if (curpar!=type) {par=par.plus(formatEcho(curpar.name, 10))}
            curpar = curpar.base
        }

        return formatEcho(type.name, 8)+" ${formatEcho(t,20)} ${formatEcho(type.base.name, 25)} ${par}"
        }
    
    static Str slotInfo(Slot slot) {
        
        Str full:= slot.qname
        Str type:= slot.isField ? "*" : (slot.isMethod ? "M" : "Other")
        Str lib:= slot.parent.name
        Str pod:= slot.parent.pod.name
        Str name:= formatEcho(slot.name, 15)

        Str in:= ""
        Str out:= ""
        Str paramStr:= ""

        if (slot.isMethod) {
            paramz:= Slot.findMethod(full).params
            p1:= paramz.first
            
            if (p1!=null) {in=p1.type.toStr} 
            out = Slot.findMethod(full).returns.name

            paramz.each |p, i| {
                addStr:= "["+p.type.qname + " " + p.name + "" + (p.hasDefault ? " (def) " : "") +"]"
                if(i == 0) {paramStr = addStr}
                else{paramStr = paramStr  + ", " + addStr}
                }
        } 

        return [
                formatEcho(type, 3), 
                formatEcho(pod, 15), 
                formatEcho(in, 25), 
                formatEcho(name, 20), 
                formatEcho(out, 10), 
                formatEcho(paramStr, 50),
                "--$lib--",
                ].join(" ")
        }

    //lookup 
    static Void lookupMethods(Obj obj) {
        
        Type self:= obj.typeof
        Type base:= self.base 
        echo("$self.qname [$base.name]")

        poss:= obj.typeof.methods()
        logitall(poss.map |Method m->Str| {m.qname})
    
    }
    
    //search 
    static Str[] searchList(Str[] list, Str search:="") {
        out:=list 
        if (search!="") {out = out.findAll(|Str? str->Bool| {str != null && str is Str && str.lower.contains(search.lower)})}
        return out 
    }

    //list pods 
    static Void listPods(Str search:= "") {

        //get all pods 
        Str[] pods:= Pod.list.map |Pod p->Str?| {return podInfo(p)}
        echo("Found ${pods.size} pods")

        //search if applicable 
        pods = searchList(pods, search)
        
        logitall(pods)
        return

    }

    //list classes 
    static Void listClasses(Str podName, Str search:= "") {

        Pod? pod:= Pod.find(podName)
        if (pod==null) {
            echo("Pod not found: $podName")
            return
        }

        Str[] classes:= podClasses(pod).map |Type type->Str| {classInfo(type)}

        //search if applicable 
        classes = searchList(classes, search)
        
        logitall(classes)
        return

    }

    //list slots 
    static Void listSlots(Str podName, Str className, Str search:= "") {

        Pod? pod:= Pod.find(podName)
        if (pod==null) {
            echo("Pod not found: $podName")
            return
        }

        Type? type:= Type.find("${podName}::${className}")
        if (type==null) {
            echo("Class not found: ${podName}::${className}")
            return
        }

        Str[] slots:= classSlots(type).map |Slot t->Str| {slotInfo(t)}

        //search if applicable 
        slots = searchList(slots, search)
        
        echo([  formatEcho("type", 6), 
                formatEcho("pod", 15), 
                formatEcho("in", 10), 
                formatEcho("name", 20), 
                formatEcho("out", 10), 
                formatEcho("params", 50), 
                "class",
                ].join(" "))
        echo("------------------------------------------------------------------------------------------------------------")

        logitall(slots)
        return

    }

    //list parents 
    static Type[] findParents(Type[] parents, Type type) {
        parent := type.base 
           if (parent!=null) { 
               parents.add(parent)
               getParentTree(parent)
           }
        return parents
    }
    
    static Void getParentTree(Type t) {

        Type[] parents:= [,]
        
        findParents(parents, t)
        
        Str[] out:= parents.map | Type tre->Str | {tre.qname} 
        logitall(out)
        return 

    }

} 

class Main {

    static Str main() {

        Inspector.listPods("")
        //Inspector.listClasses("ruleExt", "")
        //Inspector.listSlots("build", "BuildPod", "")
        
        //Inspector.lookupMethods("kwLinkFCoreExt")
        //echo(testDomkit::MenuTest.make().typeof)
        //Inspector.getParentTree((ui::UiView).typeof)
        echo("hello")
        return "hello"
      
    }

}