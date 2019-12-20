const AWS = require('aws-sdk');
const StsClient = new AWS.STS();

exports.handler = async (event) => {
    console.log("Starting test function");
    
    const Role = event.queryStringParameters.role;
    const dashboardID = event.queryStringParameters.dashboardID;
    const emailID = event.queryStringParameters.emailID;
    const dashboardRegion = event.queryStringParameters.dashboardRegion;
    const userType = event.queryStringParameters.userType;
    const accountID = '<Account ID>'; // 12 numbers
    const roleToAssume = "<QSEmbedRole>"; // IAM Role e.g arn:aws:iam::<Account ID>:role/<Role Name>
    
    /* logic for IAM based identities */

    const StsAssumeRoleparams = {
        DurationSeconds: 3600,
        RoleArn: roleToAssume,
        RoleSessionName: emailID
    };

    let assumeRoleResp = await StsClient.assumeRole(StsAssumeRoleparams).promise();

    let QSClientCredentials = {
        accessKeyId: assumeRoleResp.Credentials.AccessKeyId,
        secretAccessKey: assumeRoleResp.Credentials.SecretAccessKey,
        sessionToken: assumeRoleResp.Credentials.SessionToken
    }

    let QSClientForRegisteringUserOptions = { credentials: QSClientCredentials, region: 'us-east-1' };

    let QSClientForGeneratingDashboardOptions = { credentials: QSClientCredentials, region: 'us-east-1' };

    const QSClientForRegisteringUser = new AWS.QuickSight(QSClientForRegisteringUserOptions);

    const QSClientForGeneratingDashboard = new AWS.QuickSight(QSClientForGeneratingDashboardOptions);

    let regUserparams = {
        AwsAccountId: accountID, /* required */
        Email: emailID, /* required */
        IdentityType: 'IAM',
        Namespace: 'default', /* required */
        UserRole: Role, /* required */
        IamArn: roleToAssume,
        SessionName: emailID
    };
    
    try {
        let regUserResp = await QSClientForRegisteringUser.registerUser(regUserparams).promise();
        console.log(regUserResp);
    }
    catch (Error) {
        if (Error.code == 'ResourceExistsException') {
            console.log("user already exists");
        }
    }
    
    let getDashboardParams = {
        AwsAccountId: accountID, /* required */
        DashboardId: dashboardID, /* required */
        IdentityType: 'IAM', /* required */
        SessionLifetimeInMinutes: 600,
    };
    
    let QSDashboardEmbedResponse = await QSClientForGeneratingDashboard.getDashboardEmbedUrl(getDashboardParams).promise();
    
    const response = {
        statusCode: 200,
        headers: {
        "X-Requested-With": '*',
        "Access-Control-Allow-Headers": 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-requested-with',
        "Access-Control-Allow-Origin": '*',
        "Access-Control-Allow-Methods": 'POST,GET,OPTIONS'
    },
        body: JSON.stringify(QSDashboardEmbedResponse),
    };
    return response;
};
