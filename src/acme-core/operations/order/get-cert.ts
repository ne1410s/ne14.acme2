import { JsonOperation, HttpResponseError, ValidationError } from '@ne1410s/http';
import { IGetCertRequest, IGetCertResponse } from '../../interfaces/order/get-cert';

export class GetCertOperation extends JsonOperation<IGetCertRequest, IGetCertResponse> {
  private readonly CONTENT_TYPE_OPTS: Array<string> = [
    'application/pem-certificate-chain',
    'application/pkcs7-mime',
    'application/pkix-cert',
    'application/x-pkcs12',
  ];

  constructor(private baseUrl: string) {
    super(`${baseUrl}/cert/{certCode}`, 'get');
  }

  validateRequest(requestData: IGetCertRequest): void {
    const messages: string[] = [];
    requestData = requestData || ({} as IGetCertRequest);
    const contentType = (requestData.contentType || '').toLowerCase();

    if (!requestData.certCode || requestData.certCode.length == 0) {
      messages.push('Cert code is required');
    }

    if (contentType != '' && this.CONTENT_TYPE_OPTS.indexOf(contentType) == -1) {
      messages.push('Content type not supported: ' + contentType);
    }

    if (messages.length !== 0) {
      throw new ValidationError('The request is invalid', requestData, messages);
    }

    // Once deemed valid; correct the operation url at invocation time
    this._url = `${this.baseUrl}/cert/${requestData.certCode}`;

    this.headers.delete('accept');
    if (requestData.contentType) {
      this.headers.set('accept', requestData.contentType);
    }
  }

  async deserialise(response: Response, requestData: IGetCertRequest): Promise<IGetCertResponse> {
    if (!response.ok) {
      throw new HttpResponseError(response, this.verb);
    }

    return {
      contentType: response.headers.get('content-type'),
      content: await response.text(),
    };
  }

  validateResponse(responseData: IGetCertResponse): void {
    const messages: string[] = [];
    responseData = responseData || ({} as IGetCertResponse);

    if (!responseData.contentType) {
      messages.push('Content type is expected');
    } else {
      const requestType = this.headers.get('accept');

      if (requestType && requestType != responseData.contentType) {
        messages.push(`Content is "${responseData.contentType}", but expected "${requestType}"`);
      }
    }

    if (!responseData.content) {
      messages.push('Content is expected');
    }

    if (messages.length !== 0) {
      throw new ValidationError('The response is invalid', responseData, messages);
    }
  }
}
