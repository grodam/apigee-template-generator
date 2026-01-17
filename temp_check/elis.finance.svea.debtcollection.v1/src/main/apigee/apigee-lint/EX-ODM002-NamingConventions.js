const plugin = {
  ruleId: "EX-ODM002",
  name: "Policy Naming Conventions - Type Indication",
  message: "It is recommended that the policy name include an indicator of the policy type.",
  fatal: false,
  severity: 2, //error
  nodeType: "Policy",
  enabled: true
},
policyMetaData = {
  //Traffic Management
  Quota: { indications: ["QO-"] },
  SpikeArrest: { indications: ["SA-"] },
  ConcurrentRateLimit: { indications: ["CRL-"] },
  ResponseCache: { indications: ["RC-"] },
  LookupCache: { indications: ["LC-"] },
  PopulateCache: { indications: ["PC-"] },
  InvalidateCache: { indications: ["IC-"] },
  ResetQuota: { indications: ["RQ-"] },
  //Security
  BasicAuthentication: {indications: ["BA-"] },
  XMLThreatProtection: { indications: ["XTP-"] },
  JSONThreatProtection: { indications: ["JTP-"] },
  RegularExpressionProtection: { indications: ["REP-"] },
  OAuthV1: { indications: ["OA-"]},
  GetOAuthV1Info:{indications: ["OA1-"]},
  DeleteOAuthV1Info:{indications: ["O1-"]},
  OAuthV2: {indications: ["O2-"]},
  GetOAuthV2Info: {indications: ["O2-"]},
  SetOAuthV2Info: {indications: ["O2-"]},
  DeleteOAuthV2Info: {indications: ["O2-"]},
  VerifyAPIKey: { indications: ["VK-"] },
  AccessControl: { indications: ["AC-"] },
  Ldap: { indications: ["LD-"] },
  GenerateSAMLAssertion: { indications: ["GEN-"] },
  ValidateSAMLAssertion: { indications: ["SAML-"] },
  GenerateJWT: { indications: ["JW1-"] },
  VerifyJWT: { indications: ["JW1-"] },
  DecodeJWT: { indications: ["JWT-"] },
  GenerateJWS: { indications: ["JWS-"] },
  VerifyJWS: { indications: ["JWS-"] },
  DecodeJWS: { indications: ["JWS-"] },
  //Mediation
  JSONToXML: { indications: ["JX-"] },
  XMLToJSON: { indications: ["XTJ-"] },
  RaiseFault: { indications: ["RF-"] },
  XSL: { indications: ["XSL-"] },
  MessageValidation: { indications: ["MV-"] },
  AssignMessage: { indications: ["AM-"] },
  ExtractVariables: { indications: ["EV-"] },
  AccessEntity: { indications: ["AE-"] },
  KeyValueMapOperations: { indications: ["KVM-"] },
  //Extension
  JavaCallout: { indications: ["JC-"] },
  Javascript: { indications: ["JS-"] },
  Script: { indications: ["PY-"] },
  ServiceCallout: { indications: ["SC-"] },
  FlowCallout: { indications: ["FC-"] },
  StatisticsCollector: { indications: ["SC-"] },
  MessageLogging: { indications: ["ML-"] },
  "": { indications: [] }
};

const onPolicy = function(policy, cb) {
  let displayName = policy.getDisplayName(),
    policyType = policy.getType(),
    prefixes = policyMetaData[policyType],
    hadWarn = false;

  if (prefixes && prefixes.indications.length > 0) {
    if (
      !prefixes.indications.some(function(indication) {
        return displayName.startsWith(indication);
      })
    ) {
      hadWarn = true;
      policy.addMessage({
        plugin,
        message:
          "Non-standard name for policy (" +
          policy.getDisplayName() +
          "). Valid prefixes include: { " +
          prefixes.indications.join(", ") +
          " }"
      });
    }
  }
  if (typeof cb == "function") {
    cb(null, hadWarn);
  }
};

module.exports = {
  plugin,
  onPolicy
};