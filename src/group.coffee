

_ = require 'lodash'
moment = require 'moment'
uuid = require 'node-uuid'

groupForUser = (user, DB) ->
  group = _.filter DB.Groups, (g) ->
    _.includes g.users, user
  if group.length != 1
    return -1
  group[0]

module.exports = (root) ->
  # destructive removale of user. Make sure to insert him into another group afterwards
  leaveGroup = (user_id) ->
    group = groupForUser user_id, root.DB

    # remove user from group
    _.remove group.users, (u) -> u == user_id

  groupForUser = (user) ->
    group = _.filter root.DB.Groups, (g) ->
      _.includes g.users, user
    if group.length != 1
      return -1
    group[0]


  # return
  createGroup: (user_id, group_users) ->
    new Promise (resolve) ->
      # make sure the user is not in two groups at the same time
      leaveGroup user_id

      # the creator immediatley joins the group
      pendingUsers = _.reject group_users, (id) -> id == user_id

      newGroup =
        id: uuid.v4()
        users: [user_id]
      if pendingUsers.length > 0
        newGroup.pendingUsers = pendingUsers
      root.DB.Groups.push newGroup
      resolve newGroup

  # get the Group of one user
  getGroupForUser: (user_id) ->
    new Promise (resolve, reject) ->
      group = groupForUser user_id, root.DB
      if group == -1
        reject "Could not find a group for user with ID #{user_id}"
        return
      resolve group

  # returns a list of groups with pending invitations
  pendingGroups: (user_id) ->
    new Promise (resolve) ->
      pending = _.select root.DB.Groups, (g) ->
        g.pendingUsers and _.includes g.pendingUsers, user_id
      resolve pending

  rejectInvitation: (user_id, group_id) ->
    new Promise (resolve, reject) ->
      group = _.filter root.DB.Groups, id: group_id
      if group.length > 1 or group.length == 0
        resolve()
        return

      group = group[0]
      if group.pendingUsers
        group.pendingUsers = _.reject group.pendingUsers, (id) -> user_id == id
      resolve()

  joinGroup: (user_id, group_id) ->
    new Promise (resolve, reject) ->
      group = _.filter root.DB.Groups, id: group_id
      if group.length > 1 or  group.length <= 0
        reject "Inconsistent groups. Multiple groups with ID: #{group_id}"
        return

      group = group[0]

      # return if the user is already in the group
      if _.includes group.users, user_id
        resolve()
        return
      # make sure the user is invited to the group
      if not group.pendingUsers or not _.includes group.pendingUsers, user_id
        reject "User cannot join a group without invitation"
        return

      # make sure the user is not in two groups at the same time
      leaveGroup user_id
      group.pendingUsers = _.reject group.pendingUsers, user_id
      if group.pendingUsers.length == 0
        delete group.pendingUsers
      group.users.push user_id
      resolve()
