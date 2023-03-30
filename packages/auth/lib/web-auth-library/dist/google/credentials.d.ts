/**
 * Service account key for Google Cloud Platform (GCP)
 * https://cloud.google.com/iam/docs/creating-managing-service-account-keys
 */
export declare type Credentials = {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_id: string;
    client_email: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
};
export declare function getCredentials(value: Credentials | string): Credentials;
