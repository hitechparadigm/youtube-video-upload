#!/usr/bin/env node

/**
 * Lambda Invoker - Standardized Lambda function invocation
 */

import { InvokeCommand } from '@aws-sdk/client-lambda';
import AWSHelpers from './aws-helpers.js';

class LambdaInvoker {
    constructor() {
        this.lambdaClient = AWSHelpers.getLambdaClient();
    }

    async invokeWithHTTP(functionName, method, path, bodyData) {
        try {
            const payload = {
                httpMethod: method,
                path: path,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            };

            const command = new InvokeCommand({
                FunctionName: functionName,
                Payload: JSON.stringify(payload),
                InvocationType: 'RequestResponse'
            });
            
            const response = await this.lambdaClient.send(command);
            
            let result = null;
            if (response.Payload) {
                const payloadString = new TextDecoder().decode(response.Payload);
                result = JSON.parse(payloadString);
            }
            
            const success = response.StatusCode === 200 && (!result.statusCode || result.statusCode === 200);
            
            return {
                success,
                statusCode: response.StatusCode,
                data: result,
                functionError: response.FunctionError
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async invokeDirect(functionName, payload) {
        try {
            const command = new InvokeCommand({
                FunctionName: functionName,
                Payload: JSON.stringify(payload),
                InvocationType: 'RequestResponse'
            });
            
            const response = await this.lambdaClient.send(command);
            
            let result = null;
            if (response.Payload) {
                const payloadString = new TextDecoder().decode(response.Payload);
                result = JSON.parse(payloadString);
            }
            
            return {
                success: response.StatusCode === 200,
                statusCode: response.StatusCode,
                data: result,
                functionError: response.FunctionError
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async batchInvoke(invocations) {
        const results = [];
        
        for (const invocation of invocations) {
            const result = await this.invokeWithHTTP(
                invocation.functionName,
                invocation.method,
                invocation.path,
                invocation.body
            );
            
            results.push({
                functionName: invocation.functionName,
                ...result
            });
        }
        
        return results;
    }
}

export default LambdaInvoker;