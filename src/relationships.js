import get from 'lodash.get';
import { pluralize } from 'inflection';
import { getRelatedType, getTypeFromKey, getRelatedKey } from './nameConverter';

export const isRelationshipField = fieldName => fieldName.endsWith('_id');
export const isManyToManyRelationshipField = fieldName =>
    fieldName.endsWith('_ids');

export const getRelationshipInfo = (
    key,
    fieldName,
    relationships,
    many = false
) => {
    const override = get(relationships, `${key}.${fieldName}`, {});
    const type = getTypeFromKey(key);
    const relType = override.ref
        ? getTypeFromKey(override.ref)
        : getRelatedType(fieldName);
    const field = many ? pluralize(relType) : relType;
    const foreignField = override.foreignField || pluralize(type.toString());
    return {
        field: override.field || field,
        foreignField,
        type: relType,
        ref: override.ref || getRelatedKey(fieldName, many),
    };
};
