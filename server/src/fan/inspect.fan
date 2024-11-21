class VscodeInspect {
  
  // Fields
  Str? name
  Str? pod
  Str? clazz
  Str? opts

  // Constructor
  new make(Str? name, Str? pod, Str? clazz, Str? opts := null) {
    this.name = name
    this.pod = pod
    this.clazz = clazz
    this.opts = opts
  }

  // Method to document the class information
  Str docClass() {
    return "### Class Documentation\n" +
           "**Name**: ${name}\n" +
           "**Pod**: ${pod}\n" +
           "**Class**: ${clazz}\n" +
           (opts != null ? "**Options**: ${opts}" : "")
  }

  // Method to document a specific method in the class
  Str docMethod(Str methodName, Str inputs, Str outputs) {
    return "### Method Documentation\n" +
           "**Class**: ${clazz}\n" +
           "**Method**: ${methodName}\n" +
           "**Inputs**: ${inputs}\n" +
           "**Outputs**: ${outputs}\n"
  }

  // Method to document the pod information
  Str docPod() {
    return "### Pod Documentation\n" +
           "**Pod**: ${pod}\n" +
           "**Contains Class**: ${clazz}\n" +
           (opts != null ? "**Options**: ${opts}" : "")
  }

  // Method to document sibling classes within the same pod
  Str docSiblings(Str[] siblingClasses) {
    return "### Sibling Classes\n" +
           "**Pod**: ${pod}\n" +
           "**Sibling Classes**:\n" +
           siblingClasses.join("\n- ", "- ", "")
  }
}