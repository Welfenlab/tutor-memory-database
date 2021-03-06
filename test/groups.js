
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
chai.should();

var db = require("../lib/db")({log:function(){}});

/*
 * IMPORTAT: try to use only numbers for user IDs here and strings for user
 * pseudonyms!
 */

describe("Group queries", function(){
  it("should return the group for a user", function(){
    var DB = {Groups:[
      {id:1,users:[1,5]},
      {id:2,users:[2,3]},
      {id:3,users:[4]}
    ], Users:[{id:1,pseudonym:"A"}]};
    db.Set(DB);

    return db.Groups.getGroupForUser(1).then(function(group){
      group.id.should.equal(1);
    });
  });
  it("should be possible to create a group of users", function(){
    var DB = {Groups:[], Users:[
      {id:1,pseudonym:"A"},
      {id:2,pseudonym:"B"},
      {id:3,pseudonym:"C"}
    ]};
    db.Set(DB);
    return db.Groups.create(1,["A","B","C"]).then(function(group){
      group.users.should.deep.equal(["A"]);
    });
  });
  it("creating a group of users should add others as pending", function(){
    var DB = {Groups:[], Users:[
      {id:1,pseudonym:"A"},
      {id:2,pseudonym:"B"},
      {id:3,pseudonym:"C"}
    ]};
    db.Set(DB);
    return db.Groups.create(1,["A","B","C"]).then(function(group){
      group.should.have.property("pendingUsers");
      group.pendingUsers.should.include.members(["B","C"]);
    });
  });
  it("should return all pending group invitations", function(){
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.pending(2).then(function(pending){
      pending.should.have.length(2);
      pending.should.deep.include.members([{id:1,users:["A"],pendingUsers:["B","C"]},
                                          {id:2,users:["D"],pendingUsers:["B","C"]}]);
    });
  });
  it("should be able to join a group with an invitation", function(){
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.joinGroup(2, 2).then(function(group){
      group.users.should.have.length(2);
      group.users.should.contain("B");
    });
  });
  it("should not be possible to join a group without an invitation", function(){
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.joinGroup(2, 3).should.be.rejected;
  });
  it("should not be possible to join a non existing group", function(){
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.joinGroup(2, 151).should.be.rejected;
  });
  it("should be able to reject a group invitation", function(){
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.rejectInvitation(2, 2).then(function(){
      DB.Groups[1].pendingUsers.should.have.length(1);
    });
  });
  it("should be possible to leave a group", function() {
    var DB = {Groups:[{id:1,users:[1],pendingUsers:[2,3]},
                      {id:2,users:[4],pendingUsers:[2,3]},
                      {id:3,users:[7],pendingUsers:[1,3]}],
              Users: [{id:1,pseudonym:"A"},{id:2,pseudonym:"B"},
                {id:3,pseudonym:"C"},{id:4,pseudonym:"D"},{id:7,pseudonym:"G"}]};
    db.Set(DB);
    return db.Groups.leaveGroup(1).then(function() {
      DB.Groups[0].users.should.be.empty;
      DB.Users[0].previousGroups.should.contain(1);
    })
  });
});
