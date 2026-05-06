export const staticSiteTemplate = `
AWSTemplateFormatVersion: "2010-09-09"
Description: Plot static site — S3 bucket with CloudFront distribution (OAC).

Parameters:
  SiteName:
    Type: String
    Description: Unique name for the site resources.

Resources:
  SiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "plot-site-\${SiteName}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  OriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: !Sub "plot-oac-\${SiteName}"
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt SiteBucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: ""
            OriginAccessControlId: !GetAtt OriginAccessControl.Id
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
          CachedMethods:
            - GET
            - HEAD
          ForwardedValues:
            QueryString: false
          Compress: true
        CustomErrorResponses:
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
            ErrorCachingMinTTL: 0
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
            ErrorCachingMinTTL: 0
        ViewerCertificate:
          CloudFrontDefaultCertificate: true
        HttpVersion: http2

  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref SiteBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowCloudFrontOAC
            Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource: !Sub "arn:aws:s3:::plot-site-\${SiteName}/*"
            Condition:
              StringEquals:
                "AWS:SourceArn": !Sub "arn:aws:cloudfront::\${AWS::AccountId}:distribution/\${Distribution}"

Outputs:
  BucketName:
    Description: Name of the S3 bucket.
    Value: !Ref SiteBucket
  DistributionId:
    Description: CloudFront distribution ID.
    Value: !Ref Distribution
  DistributionDomainName:
    Description: CloudFront domain name for the site.
    Value: !GetAtt Distribution.DomainName
`;
