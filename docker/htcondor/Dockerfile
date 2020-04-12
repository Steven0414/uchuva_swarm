######################################################
#
# Agave DevOps HTCondor Server
# Tag: agaveapi/htcondor
#
# This container provides a standard condor controller
# and worker created on top of the agaveapi/centos-base
# image. Nothing special here.
#
# Usage:
# docker run -h docker.example.com -i -t  \
#            -p 10022:22                  \ # SSHD, SFTP
#            agaveapi/htcondor
#
# note: you will need to make sure the file limit on
# the docker host is set to at least 10240 in order
# for condor to start properly. The following command
# will set this for you. Call it prior to starting the
# docker daemon
#
# $> ulimit -n 10240
#
# https://bitbucket.org/taccaci/agave-environment
#
######################################################

# FROM agave-api/centos-base
FROM centos

MAINTAINER Rion Dooley <dooley@tacc.utexas.edu>

# Add condor user
RUN adduser condor && \
    echo "condor:condor" | chpasswd
USER condor
RUN mkdir /home/condor/.ssh
ADD ssh/id_rsa.pub /home/condor/.ssh/authorized_keys
USER root

# Install python

RUN dnf -y install python3
RUN python3 --version

# Install ht condor
# RUN curl -o /etc/yum.repos.d/htcondor-stable-rhel6.repo http://research.cs.wisc.edu/htcondor/yum/repo.d/htcondor-stable-rhel6.repo
RUN curl -o /etc/yum.repos.d/htcondor-stable-rhel8.repo https://research.cs.wisc.edu/htcondor/yum/repo.d/htcondor-stable-rhel8.repo
RUN curl -o RPM-GPG-KEY-HTCondor https://research.cs.wisc.edu/htcondor/yum/RPM-GPG-KEY-HTCondor
RUN rpm --import http://research.cs.wisc.edu/htcondor/yum/RPM-GPG-KEY-HTCondor
# RUN yum -y --enablerepo=centosplus install condor-8.4.11
RUN yum -y --enablerepo=centosplus install condor --skip-broken

ADD htcondor/condor_config.local /etc/condor/condor_config.local
ADD htcondor/condor.submit /etc/condor/test.submit
WORKDIR /etc/condor

# Install SSHD (Open SSH)
RUN yum -y install openssh-server
RUN ssh-keygen -A
# RUN /usr/sbin/sshd -D
# RUN systemctl sshd status

# Install supervisor
# RUN yum update -y
RUN yum -y install epel-release
# RUN yum update -y
RUN yum -y install supervisor

# Conf supervisor
ADD supervisord.conf /etc/supervisord.conf
# RUN mkdir /var/log/supervisor
RUN chmod -R 777 /var/log/supervisor

VOLUME /var/lib/condor

RUN useradd -ms /bin/bash uchuva
RUN gpasswd -a uchuva condor
RUN newgrp condor

EXPOSE 10389 22 9618
CMD /usr/bin/supervisord -c /etc/supervisord.conf
# CMD /usr/bin/supervisord