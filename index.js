const iconv = require('iconv-lite');

const defaultTriggerValue = 'never';

module.exports.templateTags = [
  {
    "name": "magentoauthparse",
    "displayName": "Magento Auth Parse",  
    "description": "Parse raw response of Magento Web Api Auth to use in chain requests.",
    args: [
      {
        displayName: 'Request',
        type: 'model',
        model: 'Request',
      },
      {
        displayName: 'Trigger Behavior',
        help: 'Configure when to resend the dependent request',
        type: 'enum',
        defaultValue: defaultTriggerValue,
        options: [
          {
            displayName: 'Never',
            description: 'never resend request',
            value: 'never',
          },
          {
            displayName: 'No History',
            description: 'resend when no responses present',
            value: 'no-history',
          },
          {
            displayName: 'When Expired',
            description: 'resend when existing response has expired',
            value: 'when-expired',
          },
          {
            displayName: 'Always',
            description: 'resend request when needed',
            value: 'always',
          },
        ],
      },
      {
        displayName: 'Max age (seconds)',
        help: 'The maximum age of a response to use before it expires',
        type: 'number',
        hide: args => {
          const triggerBehavior = (args[1] && args[1].value) || defaultTriggerValue;
          return triggerBehavior !== 'when-expired';
        },
        defaultValue: 60,
      },
    ],

    async run(context, id, resendBehavior, maxAgeSeconds) {
      resendBehavior = (resendBehavior || defaultTriggerValue).toLowerCase();

      if (!id) {
        throw new Error('No request specified');
      }

      const request = await context.util.models.request.getById(id);
      if (!request) {
        throw new Error(`Could not find request ${id}`);
      }

      const environmentId = context.context.getEnvironmentId();
      let response = await context.util.models.response.getLatestForRequestId(id, environmentId);

      let shouldResend = false;
      switch (resendBehavior) {
        case 'no-history':
          shouldResend = !response;
          break;

        case 'when-expired':
          if (!response) {
            shouldResend = true;
          } else {
            const ageSeconds = (Date.now() - response.created) / 1000;
            shouldResend = ageSeconds > maxAgeSeconds;
          }
          break;
        
        case 'always':
          shouldResend = true;
          break;

        case 'never':
        default:
          shouldResend = false;
          break;

      }

      const requestChain = context.context.getExtraInfo('requestChain') || [];
      if (requestChain.some(id => id === request._id)) {
        console.log('[response tag] Preventing recursive render');
        shouldResend = false;
      }

      if (shouldResend && context.renderPurpose === 'send') {
        console.log('[response tag] Resending dependency');
        requestChain.push(request._id)
        response = await context.network.sendRequest(request, [
          { name: 'requestChain', value: requestChain }
        ]);
      }

      if (!response) {
        console.log('[response tag] No response found');
        throw new Error('No responses for request');
      }

      if (response.error) {
        console.log('[response tag] Response error ' + response.error);
        throw new Error('Failed to send dependent request ' + response.error);
      }

      if (!response.statusCode) {
        console.log('[response tag] Invalid status code ' + response.statusCode);
        throw new Error('No successful responses for request');
      }

      const bodyBuffer = context.util.models.response.getBodyBuffer(response, '');
      const match = response.contentType && response.contentType.match(/charset=([\w-]+)/);
      const charset = match && match.length >= 2 ? match[1] : 'utf-8';
        try {
          rawValue = iconv.decode(bodyBuffer, charset);
        } catch (err) {
          console.warn('[response] Failed to decode body', err);
          rawValue = bodyBuffer.toString();
        }
        return parse(rawValue);
    },
  },
];

function parse(rawValue) {
  return rawValue.replace(/"/g, '');
}