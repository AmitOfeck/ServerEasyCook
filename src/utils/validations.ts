export function validateMandatoryFields<T>(data: Partial<T>, mandatoryFields: (keyof T)[]): boolean {
    for (const field of mandatoryFields) {
        if (data[field] === undefined || data[field] === null) {
            return false;
        }
    };

    return true;
}