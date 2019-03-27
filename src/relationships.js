import get from 'lodash.get';
import { pluralize } from 'inflection';
import { getRelatedType, getTypeFromKey, getRelatedKey } from './nameConverter';

export const isRelationshipField = fieldName => fieldName.endsWith('_id');

export const getRelationshipInfo = (key, fieldName, relationships) => {
    const override = get(relationships, `${key}.${fieldName}`, {});
    const type = getTypeFromKey(key);
    const relType = override.ref
        ? getTypeFromKey(override.ref)
        : getRelatedType(fieldName);
    const field = override.field || relType;
    const foreignField = override.foreignField || pluralize(type.toString());

    return {
        field,
        foreignField,
        type: relType,
        ref: override.ref || getRelatedKey(fieldName),
    };
};
