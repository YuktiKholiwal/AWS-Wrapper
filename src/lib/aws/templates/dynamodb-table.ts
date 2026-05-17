export const dynamoDbTableTemplate = `
AWSTemplateFormatVersion: "2010-09-09"
Description: Plot database — DynamoDB table with on-demand capacity.

Parameters:
  TableName:
    Type: String
    Description: Unique name for the table.

Resources:
  DynamoTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "plot-db-\${TableName}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE

Outputs:
  TableName:
    Description: DynamoDB table name.
    Value: !Ref DynamoTable
  TableArn:
    Description: DynamoDB table ARN.
    Value: !GetAtt DynamoTable.Arn
  Region:
    Description: AWS region.
    Value: !Ref "AWS::Region"
`;
