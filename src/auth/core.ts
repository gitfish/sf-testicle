interface IBaseAccessRequest {
    loginUrl?: string;
    username?: string;
    clientId?: string;
    tokenEndpoint?: string;
}

interface IAccess {
    access_token: string;
    scope?: string;
    instance_url?: string;
    id?: string;
    token_type?: string;
}

interface IAccessSupplier {
    () : Promise<IAccess> | IAccess;
}

const createConstantAccessSupplier = (access : IAccess) : IAccessSupplier => {
    return () => {
        return access;
    };
};

const DefaultAccessSupplier : IAccessSupplier = () => {
    return Promise.reject({
        message: "An Access Token Supplier has not been configured"
    });
};

export {
    IBaseAccessRequest,
    IAccess,
    IAccessSupplier,
    DefaultAccessSupplier,
    createConstantAccessSupplier
}