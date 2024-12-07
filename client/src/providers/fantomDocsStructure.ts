
export const fantomPods = [
  "asn1",
  "build",
  "compiler",
  "compilerDoc",
  "compilerEs",
  "compilerJava",
  "compilerJs",
  "concurrent",
  "crypto",
  "cryptoJava",
  "dom",
  "domkit",
  "email",
  "fandoc",
  "fanr",
  "fansh",
  "graphics",
  "graphicsJava",
  "inet",
  "math",
  "nodeJs",
  "sql",
  "syntax",
  "sys",
  "util",
  "web",
  "wisp",
  "xml",
  "yaml"
]

export const haxallPods = [
  "arcbeam",
  "auth",
  "axon",
  "axonsh",
  "def",
  "defc",
  "docker",
  "docXeto",
  "folio",
  "ftp",
  "haystack",
  "hx",
  "hxApi",
  "hxClone",
  "hxCluster",
  "hxConn",
  "hxCrypto",
  "hxd",
  "hxDocker",
  "hxEcobee",
  "hxFolio",
  "hxHaystack",
  "hxHttp",
  "hxIO",
  "hxMath",
  "hxModbus",
  "hxMqtt",
  "hxNest",
  "hxObix",
  "hxPlatform",
  "hxPlatformNetwork",
  "hxPlatformSerial",
  "hxPlatformTime",
  "hxPoint",
  "hxPy",
  "hxSedona",
  "hxShell",
  "hxSql",
  "hxStore",
  "hxTask",
  "hxTools",
  "hxUser",
  "hxUtil",
  "hxXeto",
  "hxXml",
  "mqtt",
  "oauth2",
  "obix",
  "obs",
  "ph",
  "phIct",
  "phIoT",
  "phScience",
  "rdf",
  "sedona",
  "xeto",
  "xetoc",
  "xetoEnv",
  "xetoTools"
]

export const skysparkPods = [
  "arcbeamExt",
  "arcExt",
  "arcKitExt",
  "bacnet",
  "benchmark",
  "certAuthMod",
  "cloneExt",
  "clusterAuthMod",
  "clusterMod",
  "codemirror",
  "connExt",
  "debug",
  "demoExt",
  "demogen",
  "devMod",
  "docFresco",
  "docgen",
  "docHaxall",
  "docHaystack",
  "docSkySpark",
  "docviewer",
  "dropbox",
  "energyExt",
  "energyStarExt",
  "eventExt",
  "fileMod",
  "fileRepo",
  "folio3",
  "folioStore",
  "foliox",
  "geoExt",
  "ghgExt",
  "googleDrive",
  "greenButtonExt",
  "hisExt",
  "hisKitExt",
  "hvacExt",
  "hxBacnet",
  "hxOpc",
  "hxSnmp",
  "installMod",
  "iotMod",
  "jamesExt",
  "javautil",
  "jobExt",
  "jsonschema",
  "kwLinkFCoreExt",
  "ldapMod",
  "lintMod",
  "mapExt",
  "mapkit",
  "mib",
  "migrate",
  "misc",
  "mlExt",
  "modbusExt",
  "navMod",
  "notifyExt",
  "opc",
  "pdf",
  "pim",
  "podInspector",
  "projMod",
  "provExt",
  "replMod",
  "ruleExt",
  "samlSsoMod",
  "scheduleExt",
  "skyarc",
  "skyarcd",
  "slf4j_nop",
  "smileCore",
  "stackhub",
  "svg",
  "tariffExt",
  "testDomkit",
  "tie",
  "tools",
  "ui",
  "uiBuilder",
  "uiDev",
  "uiFonts",
  "uiIcons",
  "uiMisc",
  "uiMod",
  "uiPlatform",
  "userMod",
  "vdom",
  "view",
  "viz",
  "weatherExt",
  "xobjMod",
  "xqueryMod"
]

export const groups = ["Fantom", "Haxall", "SkySpark", "Other"]

export function podGroup(pod: string): string {
  if (fantomPods.includes(pod)) {
      return "Fantom"
  } else if (haxallPods.includes(pod)) {
      return "Haxall"
  } else if (skysparkPods.includes(pod)) {
      return "SkySpark"
  } else {
      return "Other"
  }
}

/**
* Enum representing the types of items in the Fantom Docs tree.
*/
export enum FantomDocType {
 Group = 'group',
 Pod = 'pod',
 Class = 'class',
 Method = 'method',
 Field = 'field',
}

