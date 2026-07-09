import { AttributeType } from '@aws-sdk/client-cognito-identity-provider';

export function getCognitoAttribute(
  attributes: AttributeType[] | undefined,
  name: string,
): string | undefined {
  return attributes?.find((attribute) => attribute.Name === name)?.Value;
}
