// in node.js error is an instance of Error object that represents a problem 
class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "" // error stack
  ) {
    // super class is used to call the parent constructor
    super(message)
    this.statusCode = statusCode
    this.data = null
    this.message = message
    this.success = false
    this.errors = errors

    if(stack){
        this.stack = stack;
    }else{
        Error.captureStackTrace(this,this.constructor)
    }
  }
}


export {ApiError}