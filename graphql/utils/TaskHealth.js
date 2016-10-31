import TaskStates from '../../plugins/services/src/js/constants/TaskStates';

function getTaskHealthFromMesos(task) {
  if (task.statuses == null) {
    return null;
  }

  const healths = task.statuses.map(function (status) {
    return status.healthy;
  });

  const healthDataExists = healths.length > 0 && healths.every((health) => {
    return typeof health !== 'undefined';
  });

  if (healthDataExists) {
    return healths.some(function (health) {
      return health;
    });
  }

  return null;
}

function getTaskHealthFromMarathon(task) {
  const {healthCheckResults} = task;

  if (healthCheckResults != null && healthCheckResults.length > 0) {
    return healthCheckResults.every((result) => result.alive);
  }

  return null;
}

export default function assignTaskHealth(task) {
  let health = TaskStates[task.state].displayName;

  let taskHealth = getTaskHealthFromMesos(task);

  if (taskHealth === null) {
    taskHealth = getTaskHealthFromMarathon(task);
  }
  // task status should only reflect health if taskHealth is defined
  if (taskHealth === true) {
    health = 'Healthy';
  }
  if (taskHealth === false) {
    health = 'Unhealthy';
  }

  task.health = health;

  return task;
}
