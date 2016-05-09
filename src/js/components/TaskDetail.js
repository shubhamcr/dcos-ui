import mixin from 'reactjs-mixin';
/* eslint-disable no-unused-vars */
import React from 'react';
/* eslint-enable no-unused-vars */
import {StoreMixin} from 'mesosphere-shared-reactjs';

import DescriptionList from './DescriptionList';
import MarathonStore from '../stores/MarathonStore';
import MesosStateStore from '../stores/MesosStateStore';
import MesosSummaryStore from '../stores/MesosSummaryStore';
import ResourceTypes from '../constants/ResourceTypes';
import RequestErrorMsg from './RequestErrorMsg';
import ServicesBreadcrumb from './ServicesBreadcrumb';
import PageHeader from './PageHeader';
import TaskDebugView from './TaskDebugView';
import TaskDirectoryView from './TaskDirectoryView';
import TaskDirectoryStore from '../stores/TaskDirectoryStore';
import TaskStates from '../constants/TaskStates';
import Units from '../utils/Units';

import InternalStorageMixin from '../mixins/InternalStorageMixin';
import TabsMixin from '../mixins/TabsMixin';

const TABS = {
  files: 'Files',
  details: 'Details',
  debug: 'Log Viewer'
};

const METHODS_TO_BIND = [
  'onTaskDirectoryStoreError',
  'onTaskDirectoryStoreSuccess'
];

class TaskDetail extends mixin(InternalStorageMixin, TabsMixin, StoreMixin) {
  constructor() {
    super(...arguments);

    this.tabs_tabs = Object.assign({}, TABS);

    this.state = {
      currentTab: 'details',
      directory: null,
      expandClass: 'large',
      showExpandButton: false,
      selectedLogFile: null,
      taskDirectoryErrorCount: 0
    };

    this.store_listeners = [
      {name: 'state', events: ['success'], listenAlways: false},
      {name: 'summary', events: ['success'], listenAlways: false},
      {name: 'taskDirectory', events: ['error', 'success']}
    ];

    METHODS_TO_BIND.forEach((method) => {
      this[method] = this[method].bind(this);
    });
  }

  componentDidMount() {
    super.componentDidMount(...arguments);
    this.store_removeEventListenerForStoreID('summary', 'success');
  }

  onStateStoreSuccess() {
    let task = MesosStateStore.getTaskFromTaskID(this.props.params.taskID);
    TaskDirectoryStore.getDirectory(task);
  }

  onTaskDirectoryStoreError() {
    this.setState({
      taskDirectoryErrorCount: this.state.taskDirectoryErrorCount + 1
    });
  }

  onTaskDirectoryStoreSuccess() {
    this.setState({
      directory: TaskDirectoryStore.get('directory'),
      taskDirectoryErrorCount: 0
    });
  }

  hasLoadingError() {
    return this.state.taskDirectoryErrorCount >= 3;
  }

  getErrorScreen() {
    return (
      <div className="container container-fluid container-pod text-align-center vertical-center inverse">
        <RequestErrorMsg />
      </div>
    );
  }

  getLoadingScreen() {
    return (
      <div className="container container-fluid container-pod text-align-center vertical-center inverse">
        <div className="row">
          <div className="ball-scale">
            <div />
          </div>
        </div>
      </div>
    );
  }

  handleOpenLogClick(selectedLogFile) {
    this.setState({selectedLogFile, currentTab: 'debug'});
  }

  getResources(task) {
    if (task.resources == null) {
      return null;
    }

    let resources = Object.keys(task.resources);

    return resources.map(function (resource) {
      if (resource === 'ports') {
        return null;
      }

      let colorIndex = ResourceTypes[resource].colorIndex;
      let resourceLabel = ResourceTypes[resource].label;
      let resourceIconClasses = `icon icon-sprite icon-sprite-medium
        icon-sprite-medium-color icon-resources-${resourceLabel.toLowerCase()}`;
      let resourceValue = Units.formatResource(
        resource, task.resources[resource]
      );
      return (
        <div key={resource} className="media-object-item">
          <div className="media-object-spacing-wrapper media-object-spacing-narrow media-object-offset">
            <div className="media-object media-object-align-middle">
              <div className="media-object-item">
                <i className={resourceIconClasses}></i>
              </div>
              <div className="media-object-item">
                <h4 className="flush-top flush-bottom inverse">
                  {resourceValue}
                </h4>
                <span className={`side-panel-resource-label
                    text-color-${colorIndex}`}>
                  {resourceLabel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }

  getBasicInfo(task) {
    let taskIcon = (
      <div
        className="icon icon-large icon-image-container icon-app-container">
        <img src={task.getImages()['icon-large']} />
      </div>
    );

    let tabs = (
      <ul className="tabs list-inline flush-bottom inverse">
        {this.tabs_getUnroutedTabs()}
      </ul>
    );

    return (
      <PageHeader
        icon={taskIcon}
        subTitle={TaskStates[task.state].displayName}
        navigationTabs={tabs}
        mediaWrapperClassName="media-object-spacing-wrapper"
        title={task.getId()} />
    );
  }

  getTaskStatus(task) {
    if (task == null || task.status == null) {
      return 'Unknown';
    }
    return task.status;
  }

  getTaskEndpoints(task) {
    let service = MarathonStore.getServiceFromTaskID(task.id);

    if ((task.ports == null || task.ports.length === 0) &&
        (task.ipAddresses == null || task.ipAddresses.length === 0)) {
      return (<dd>None</dd>);
    }

    if (service != null &&
        service.ipAddress != null &&
        service.ipAddress.discovery != null &&
        service.ipAddress.discovery.ports != null &&
        task.ipAddresses != null &&
        task.ipAddresses.length > 0) {

      let ports = service.ipAddress.discovery.ports;
      let endpoints = task.ipAddresses.reduce(function (memo, address) {
        ports.forEach(port => {
          memo.push(`${address.ipAddress}:${port.number}`);
        });
        return memo;
      }, []);

      if (endpoints.length) {
        return endpoints.map(function (endpoint) {
          return (
            <a href={`//${endpoint}`} target="_blank">{endpoint}</a>
          );
        });
      }

      return 'n/a';
    }

    return task.ports.map(function (port) {
      let endpoint = `${task.host}:${port}`;
      return (
        <a href={`//${endpoint}`} target="_blank">{endpoint}</a>
      );
    });
  }

  getMarathonTaskDetailsDescriptionList() {
    let task = MarathonStore.getTaskFromTaskID(this.props.params.taskID);

    if (task == null) {
      return null;
    }

    let headerValueMapping = {
      Host: task.host,
      Ports: task.ports,
      Endpoints: this.getTaskEndpoints(task),
      Status: this.getTaskStatus(task),
      'Staged at': task.stagedAt,
      'Started at': task.startedAt,
      Version: task.version
    };

    return (
      <DescriptionList
        className="container container-fluid flush container-pod container-pod-super-short flush-top"
        hash={headerValueMapping}
        headline="Marathon Task Configuration" />
    );
  }

  renderDetailsTabView() {
    let task = MesosStateStore.getTaskFromTaskID(this.props.params.taskID);

    if (task == null || !MesosSummaryStore.get('statesProcessed')) {
      return null;
    }

    let node = MesosStateStore.getNodeFromID(task.slave_id);

    if (node == null) {
      return (
        <p>Cannot find task information.</p>
      );
    }

    let services = MesosSummaryStore.get('states')
      .lastSuccessful()
      .getServiceList();
    let service = services.filter({ids: [task.framework_id]}).last();

    let headerValueMapping = {
      ID: task.id,
      Service: `${service.name} (${service.id})`,
      Node: `${node.hostname} (${node.id})`
    };

    let sandBoxPath = TaskDirectoryStore.get('sandBoxPath');
    if (sandBoxPath) {
      headerValueMapping['Sandbox Path'] = sandBoxPath;
    }

    let labelMapping = {};

    if (task.labels) {
      task.labels.forEach(function (label) {
        labelMapping[label.key] = label.value;
      });
    }

    return (
      <div className="container container-fluid flush">
        <div className="media-object-spacing-wrapper container-pod container-pod-super-short flush-top">
          <div className="media-object">
            {this.getResources(task)}
          </div>
        </div>
        <DescriptionList
          className="container container-fluid flush container-pod container-pod-super-short flush-top"
          hash={headerValueMapping}
          headline="Configuration" />
        <DescriptionList
          className="container container-fluid flush container-pod container-pod-super-short flush-top"
          hash={labelMapping}
          headline="Labels" />
        {this.getMarathonTaskDetailsDescriptionList()}
      </div>
    );
  }

  renderFilesTabView() {
    let {state, props} = this;
    let task = MesosStateStore.getTaskFromTaskID(props.params.taskID);
    if (this.hasLoadingError()) {
      this.getErrorScreen();
    }
    if (!state.directory || !task) {
      return this.getLoadingScreen();
    }

    return (
      <TaskDirectoryView
        directory={state.directory}
        task={task}
        onOpenLogClick={this.handleOpenLogClick.bind(this)} />
    );
  }

  renderLogViewerTabView() {
    let {state, props} = this;
    let task = MesosStateStore.getTaskFromTaskID(props.params.taskID);
    if (this.hasLoadingError()) {
      this.getErrorScreen();
    }
    if (!state.directory || !task) {
      return this.getLoadingScreen();
    }

    return (
      <TaskDebugView
        logViewClassName="inverse"
        selectedLogFile={state.selectedLogFile}
        showExpandButton={this.showExpandButton}
        directory={state.directory}
        task={task} />
    );
  }

  tabs_handleTabClick() {
    this.setState({selectedLogFile: null});

    // Only call super after we are done removing/adding listeners
    super.tabs_handleTabClick(...arguments);
  }

  getNotFound(itemType) {
    return (
      <div className="container container-fluid container-pod text-align-center">
        <h3 className="flush-top text-align-center">
          {`Error finding ${itemType}`}
        </h3>
        <p className="flush">
          {`Did not find a ${itemType} by the id "${this.props.params.taskID}"`}
        </p>
      </div>
    );
  }

  getExpandButton() {
    if (!this.state.showExpandButton) {
      return null;
    }

    return (
      <button
        className="button button-stroke button-expand"
        onClick={this.handleExpand}>
      </button>
    );
  }

  render() {
    if (MesosStateStore.get('lastMesosState').slaves == null) {
      return null;
    }

    let task = MesosStateStore.getTaskFromTaskID(this.props.params.taskID);
    let service = MarathonStore.getServiceFromTaskID(this.props.params.taskID);

    if (task == null) {
      return this.getNotFound('task');
    }

    let node = MesosStateStore.getNodeFromID(task.slave_id);

    return (
      <div className="flex-container-col">
        <ServicesBreadcrumb serviceTreeItem={service} />
        {this.getExpandButton()}
        {this.getBasicInfo(task, node)}
        {this.tabs_getTabView()}
      </div>
    );
  }
}

module.exports = TaskDetail;
