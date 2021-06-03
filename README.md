# [Insomnia Plugin] Magento Auth Parse

Template Plugin based in raw response template, to add a template able to convert auth request of Magento REST API to use in chain requests.


# Manual installation

Clone the repository.
In Plugin area of insomnia preferences click in Reveal plugin folder to find plugins directory.
Copy the plugin to Insomnia Plugin Directory.
Access the copied plugin directory and execute `npm install`.
In Plugin area of insomnia preferences click to reload plugins.

# How it works

Magento REST API have a two routes to authenticate:

- As Admin User:
    `rest/V1/integration/admin/token`

- As Customer:
    `rest/V1/integration/customer/token`

The API response returns a generated token string in raw body, when used to Default template tag of insomnia Raw Response the `"` of string is copied too and cannot be filter by insomnia XPath.

The plugin works to parse token to use only value of response in declaration of chain requests based in REST API authentications.
