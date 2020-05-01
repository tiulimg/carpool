module.exports = {
    handleError: handleError,
    logRejection: logRejection,
}

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.error("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

function logRejection(rejection) {
    console.log("something went wrong: "  + rejection);
    if (rejection.stack) {
        console.dir(rejection.stack);
    }
}
