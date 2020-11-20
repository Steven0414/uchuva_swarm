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

FROM centos:centos7

COPY htcondor-stable-rhel7.repo /etc/yum.repos.d/htcondor-stable-rhel7.repo

RUN yum -y install \
         yum-utils \
         sudo \
         which \
         openssh-clients && \
         yum -y groupinstall 'Development Tools' && \
         curl -o RPM-GPG-KEY-HTCondor https://research.cs.wisc.edu/htcondor/yum/RPM-GPG-KEY-HTCondor && \
         rpm --import http://research.cs.wisc.edu/htcondor/yum/RPM-GPG-KEY-HTCondor && \
         yum -y install epel-release && \
         curl -O https://research.cs.wisc.edu/htcondor/yum/stable/rhel7/condor-8.4.9-1.el7.x86_64.rpm && \
         # yum -y install condor supervisor openssh-server && \
         yum -y install condor-8.4.9-1.el7.x86_64.rpm supervisor openssh-server && \
    yum clean all && \
    rm -f RPM-GPG-KEY-HTCondor

RUN groupadd -g 1000 uchuva && \
    useradd -m -u 1000 -g 1000 uchuva && \
    usermod -a -G condor uchuva && \
    echo 123456 | passwd --stdin uchuva && \
    rm -f /etc/localtime && \
    ln -s /usr/share/zoneinfo/America/Chicago /etc/localtime

ADD htcondor/condor_config.local /etc/condor/condor_config.local
ADD htcondor/condor.submit /home/uchuva/test.submit

RUN mkdir /home/uchuva/.ssh/
ADD ssh/id_rsa.pub /home/uchuva/.ssh/authorized_keys
RUN chmod -R 600 /home/uchuva/.ssh

RUN chown -R uchuva:uchuva /home/uchuva/

WORKDIR /etc/condor

# Conf supervisor
ADD supervisord.conf /etc/supervisord.conf

EXPOSE 10389 22 9618
CMD /usr/bin/supervisord -c /etc/supervisord.conf