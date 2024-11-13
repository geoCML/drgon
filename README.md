# DRGON

DRGON (pronounced like 'Dragon') is a Distributed Registry of GISystems Over a Network.

## Introduction

We get it: Finding GIS data can be difficult. DRGON collects a registry geoCML deployments over the internet (or an intranet, if you prefer). Using a simple REST API, you can easily query DRGON to find the perfect dataset.

## Quickstart Guide

Before interacting with DRGON, you must first have a hosted geoCML deployment with a properly configured geoCML Server Portal. Next, register for an API key via a POST request to `<DRGON_HOST>:8000/apikey`; You must provide an email address in the request body. Copy your API key to a safe place, you will only be able to view it once!

On your deployment's server machine, create the following system environment variables:
- DRGON_HOST: the host URL of the DRGON instance you want to use (_Do not include trailing slash_)
- DRGON_API_KEY: your DRGON API key
- GEOCML_DEPLOYMENT_HOST: the domain name of your hosted geoCML instance

Re-build and restart your geoCML instance. After ~1 minute, geoCML Task Scheduler will ping DRGON and automatically register your deployment.

### Using DRGON Over The Internet

A production DRGON instance is hosted at http://drgon.geocml.com:8000. You can use this public DRGON instance to register non-sensitive/non-confidential geoCML deployments.

### Using DRGON Over A Private Internal Network

For sensitive deployments, you can deploy your own DRGON instance behind an internal private network. Simply code this repository and deploy the Docker compose services to your favorite hosting service.
