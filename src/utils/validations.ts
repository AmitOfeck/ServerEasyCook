export function validateMandatoryFields<T>(data: Partial<T>, mandatoryFields: (keyof T)[]): boolean {
    mandatoryFields.forEach((field) => {
        if (!data[field]) {
            return false;
        }
    });

    return true;
}