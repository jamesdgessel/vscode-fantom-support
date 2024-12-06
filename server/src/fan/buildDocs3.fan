
using concurrent
using util
using concurrent::Actor
using concurrent::ActorPool
using concurrent::Future

class DocBuilder 
{
  
  Bool debug:= false

  Str outDir := Env.curDir + `/vscode-docs`
  Str indexOut:= outDir + `/index.json`
  Str podOut(Str podName) { outDir + `/` + podName + `.json` }

  Pod[] pods

  new make(Str outDir:="", Str podNames:=``) {
    if (outDir != "") 
    {
      this.outDir = outDir
      this.indexOut = outDir + `/index.json`
    }
    if (!podNames=="") this.pods = podNames.split(`,`).map |podName| {Pod.find(podName)}
    else this.pods = Pod.list.map |pod| {pod.name}
  }
  
  Str main() {} 
  
  Str buildDocs() {}
  
  Str buildDocsAsync() {} 

}
