FROM node:6-alpine

CMD ["/bin/sh"]
ENV NODE_VERSION=6.17.1
ENV YARN_VERSION=1.15.2
RUN apk add --no-cache

CMD ["node"]

RUN mkdir -p /usr/src/app
ADD ./ /usr/src/app
WORKDIR /usr/src/app

RUN npm install

ENV SHARE=/app
ENV NODE_ENV=production
ENV DATABASE_URI=mongodb://mongo/uchuva
ENV CONDOR_URL=http://condor:8080/
ENV LOGDIR=/app/logs/
RUN chmod 400 keys/id_rsa.pub

ENV HTCONDOR_SSH=true
ENV OPENLAVA_SSH=true
ENV TORQUE_SSH=true
ENV SLURM_SSH=true
ENV USEQUEUE=true
ENV USESOAP=true

RUN mkdir -p /app/logs

CMD ["npm", "start"]
EXPOSE 3000
