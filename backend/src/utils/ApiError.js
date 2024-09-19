class ApiError extends Error { 
    constructor (
        statusCode,
        messageCode = "Something Went Wrong",
        errors = [],
        stack = ""
    ){
        super(messageCode);  // Correctly pass the message to the parent Error class
        this.statusCode = statusCode;
        this.data = null;
        this.message = messageCode;  // Correctly set the message
        this.success = false;
        this.errors = errors;  // Set errors property correctly
        if (stack) {
            this.stack = stack;  // Set custom stack trace if provided
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
} 
export {ApiError}