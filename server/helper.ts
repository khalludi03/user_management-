// nota bene: this function is required by the specification -- important
export function getUniqIdValue(): string {
    return crypto.randomUUID();
}
