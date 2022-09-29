import { Response } from 'express';

const DEFAULT_SERVER_ERROR = 'Internal server error.';
const DEFAULT_SUCCESS_MESSAGE = 'Request successful.';
const DEFAULT_CLIENT_ERROR_STATUS_CODE = 400;
const DEFAULT_SUCCESS_STATUS_CODE = 200;

/**
 * @class ResponseHandler
 * @description class representing the response handler methods
 */
class ResponseHandler {
  /**
   * A method used to send server errors
   * @param {object} res - The HTTP response object.
   * @param {String} message - The error message you want to set.
   * @returns {object} res - The response object.
   */
  static serverError(res: Response, message?: string): Response {
    return res.status(500).json({
      success: false,
      error: message ?? DEFAULT_SERVER_ERROR,
    });
  }

  /**
   * A method used to send client errors
   * @param {object} res - The HTTP response object.
   * @param {String} message - The error message you want to set.
   * @param {number} status - The status code of the client error.
   * @returns {object} res - The response object.
   */
   static clientError(res: Response, message: string, status = DEFAULT_CLIENT_ERROR_STATUS_CODE): Response {
    return res.status(status).json({
      success: false,
      message,
    });
  }

  /**
   * A method used to confirm that a request was successful
   * @param {object} res - HTTP response object
   * @param {object} payload - The data we want to send to the client
   * @param {number} status = The status code of the request.
   * @returns {object} res - The response object.
   */
     static requestSuccessful({ res, payload, message,  status = DEFAULT_SUCCESS_STATUS_CODE }: {
        res: Response;
        payload?: any;
        message?: string;
        status?: number;
     }) {
      const responseObject = {
        success: true,
        message: message ?? DEFAULT_SUCCESS_MESSAGE,
      }
      if (!payload) {
        return res.status(status).send(responseObject);
      }
      return res.status(status).send({ ...responseObject, data: payload});
    }
}

export default ResponseHandler;
