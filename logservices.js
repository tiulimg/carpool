module.exports = {
    initialize: initialize,
    handleError: handleError,
    logRejection: logRejection,
}

var res;

function initialize(response) {
    return new Promise((resolve, reject) => {
        res = response;
        resolve();
    });
}

// Generic error handler used by all endpoints.
function handleError(reason, message, code) {
    console.error("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

function logRejection(rejection) {
    console.log("something went wrong: "  + rejection);
    if (rejection.stack) {
        console.dir(rejection.stack);
    }
}
