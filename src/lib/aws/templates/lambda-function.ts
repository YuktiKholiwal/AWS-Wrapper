export const lambdaFunctionTemplate = `
AWSTemplateFormatVersion: "2010-09-09"
Description: Plot serverless function — Lambda with API Gateway HTTP API.

Parameters:
  FunctionName:
    Type: String
    Description: Unique name for the function.
  Runtime:
    Type: String
    Default: nodejs20.x
  Handler:
    Type: String
    Default: index.handler
  Timeout:
    Type: Number
    Default: 30
  MemorySize:
    Type: Number
    Default: 128

Resources:
  ExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "plot-fn-\${FunctionName}-role"
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: "sts:AssumeRole"
      Policies:
        - PolicyName: LambdaBasicExecution
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - "logs:CreateLogGroup"
                  - "logs:CreateLogStream"
                  - "logs:PutLogEvents"
                Resource: !Sub "arn:aws:logs:\${AWS::Region}:\${AWS::AccountId}:*"

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub "plot-fn-\${FunctionName}"
      Runtime: !Ref Runtime
      Handler: !Ref Handler
      Timeout: !Ref Timeout
      MemorySize: !Ref MemorySize
      Role: !GetAtt ExecutionRole.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return {
              statusCode: 200,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: "Function created. Deploy your code to go live." }),
            };
          };

  HttpApi:
    Type: AWS::ApiGatewayV2::Api
    Properties:
      Name: !Sub "plot-fn-\${FunctionName}-api"
      ProtocolType: HTTP
      CorsConfiguration:
        AllowOrigins:
          - "*"
        AllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        AllowHeaders:
          - "*"

  LambdaIntegration:
    Type: AWS::ApiGatewayV2::Integration
    Properties:
      ApiId: !Ref HttpApi
      IntegrationType: AWS_PROXY
      IntegrationUri: !GetAtt LambdaFunction.Arn
      PayloadFormatVersion: "2.0"

  DefaultRoute:
    Type: AWS::ApiGatewayV2::Route
    Properties:
      ApiId: !Ref HttpApi
      RouteKey: "$default"
      Target: !Sub "integrations/\${LambdaIntegration}"

  Stage:
    Type: AWS::ApiGatewayV2::Stage
    Properties:
      ApiId: !Ref HttpApi
      StageName: "$default"
      AutoDeploy: true

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref LambdaFunction
      Action: "lambda:InvokeFunction"
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub "arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${HttpApi}/*"

Outputs:
  FunctionArn:
    Description: Lambda function ARN.
    Value: !GetAtt LambdaFunction.Arn
  FunctionName:
    Description: Lambda function name.
    Value: !Ref LambdaFunction
  ApiEndpoint:
    Description: API Gateway endpoint URL.
    Value: !GetAtt HttpApi.ApiEndpoint
`;
