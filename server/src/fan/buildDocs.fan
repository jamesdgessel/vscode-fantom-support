using concurrent

class BuildDocs {

    static Void main() {

        pods := Pod.list
        List:Obj result := [,]

        for (i := 0; i < pods.size; ++i) {
            try {
                Type? found := pods[i].types[0]
                Map:Obj podData := [
                    "podName": pods[i].name,
                    "className": found.name,
                    "documentation": found.doc ?: "",
                    "slots": found.slots.map |slot| {[
                        "name": slot.name,
                        "type": slot.qname,
                        "documentation": slot.doc ?: ""
                    ]}
                ]
                result.add(podData)
            } catch (Err e) {
                echo("failed, so sad")
                continue
            }
        }

        if (result.isEmpty) {
            return """{"error": "Failed"}"""
        }

    }
}
