export type FieldValidators<T> = {
    [K in keyof T]?: (value: any) => boolean;
};

export function validateMandatoryFields<T>(data: Partial<T>, mandatoryFields: (keyof T)[]): boolean {
    for (const field of mandatoryFields) {
        if (data[field] === undefined || data[field] === null) {
            return false;
        }
    };

    return true;
}

export function validateFieldsValues<T>(data: Partial<T>, validators: FieldValidators<T>): boolean {
    for (const field of Object.keys(data) as (keyof T)[]) {
         if (validators[field] && !validators[field]!(data[field])) {
            return false;
        };
    }
    return true;
}