// ── Operators by field type ──────────────────────────────────────────

export function getOperatorsForType(type: string): { value: string; label: string }[] {
  if (type === "bool") {
    return [{ value: ":=", label: "equals" }];
  }
  if (["int32", "int64", "float", "auto"].includes(type)) {
    return [
      { value: ":=", label: "=" },
      { value: ":!=", label: "!=" },
      { value: ":>", label: ">" },
      { value: ":<", label: "<" },
      { value: ":>=", label: ">=" },
      { value: ":<=", label: "<=" },
      { value: ":[", label: "in [...]" },
    ];
  }
  // string / string[]
  return [
    { value: ":=", label: "equals" },
    { value: ":!=", label: "not equals" },
    { value: ":[", label: "in [...]" },
  ];
}
