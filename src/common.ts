const jsonResponseErrorHandler = (response) => {
    return response.json().then(error => {
        throw {
            status: response.status,
            statusText: response.statusText,
            error: error
        };
    });
};

const jsonResponseHandler = (response) => {
    if(response.ok) {
        return response.json();
    }
    return jsonResponseErrorHandler(response);
};

export {
    jsonResponseErrorHandler,
    jsonResponseHandler
}