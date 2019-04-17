interface IAccessTokenResponse {
    access_token: string;
    scope?: string;
    instance_url?: string;
    id?: string;
    token_type?: string;
}

interface IAccessTokenSupplier {
    () : Promise<IAccessTokenResponse>;
}

const DefaultAccessTokenSupplier : IAccessTokenSupplier = () => {
    return Promise.reject({
        message: "An Access Token Supplier has not been configured"
    });
};

export {
    IAccessTokenResponse as IAccessTokenResult,
    IAccessTokenSupplier,
    DefaultAccessTokenSupplier
}