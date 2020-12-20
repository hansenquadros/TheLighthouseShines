var express = require("express");
var app = express();

var formidable = require("express-formidable");
app.use(formidable());

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
const { request } = require("http");
const { response } = require("express");
var accessTokenSecret = "myAccessTokenSecret";

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];

var mainURL = "https://thelighthouseshines.herokuapp.com/";

socketIO.on("Connection", function (socket) {
    console.log("User Connected: ", socket.id);
    socketID = socket.id;
});
http.listen(process.env.PORT || 5000, function() {
    console.log("Server Started");
    
    mongoClient.connect("mongodb+srv://hansenquadros:hansenquadros@projectdbcluster.ywsoa.mongodb.net/lighthouse_db?retryWrites=true&w=majority", function(error,client){
        var database = client.db("lighthouse_db");
        console.log("Database Connected");

        app.get("/signup", function(request,response){
            response.render("signup");
        });

        app.post("/signup", function(request,response){
            var name = request.fields.name;
            var username = request.fields.username;
            var email = request.fields.email;
            var password = request.fields.password;
            var gender = request.fields.gender;

            database.collection("users").findOne({
                $or: [{
                    "email": email
                }, {
                    "username": username
                }]
            }, function(error,user){
                if(user == null){
                    bcrypt.hash(password, 10, function(error,hash){
                        database.collection("users").insertOne({
                            "name": name,
                            "username": username,
                            "email": email,
                            "password": hash,
                            "gender": gender,
                            "profileImage": "",
                            "CoverPhoto": "",
                            "dob": "",
                            "city": "",
                            "country": "",
                            "aboutMe": "",
                            "friends": [],
                            "pages": [],
                            "notifications": [],
                            "groups": [],
                            "posts": [],
                        }, function(error,data){
                            response.json({
                                "status": "success",
                                "message": "Signed up successfully. You can login now."
                            });
                        });
                    });
                } else {
                    response.json({
                        "status": "error",
                        "message": "Email or username already exit."
                    });
                }
            });
        });
        
        app.get("/login", function(request,response){
            response.render("login");
        });

        app.post("/login", function(request,response){
            var email = request.fields.email;
            var password = request.fields.password;
            database.collection("users").findOne({
                "email": email
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "Email does not exist"
                    });
                } else {
                    bcrypt.compare(password, user.password, function(error, isVerify){
                        if(isVerify){
                            var accessToken = jwt.sign({ email:email }, accessTokenSecret);
                            database.collection("users").findOneAndUpdate({
                                "email": email
                            }, {
                                $set: {
                                    "accessToken": accessToken
                                }
                            }, function(error,data){
                                response.json({
                                    "status": "success",
                                    "message": "Login successfully",
                                    "accessToken": accessToken,
                                    "profileImage": user.profileImage
                                 });
                             });
                        } else {
                            response.json({
                                "status": "error",
                                "message": "Password is incorrect"
                            });
                        }
                    });
                }
            });
        });

        app.get("/updateProfile", function(request,response){
            response.render("updateProfile");
        });

        app.post("/getUser",function(request,response){
            var accessToken = request.fields.accessToken;
            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    response.json({
                        "status": "success",
                        "message": "Record has been fetched.",
                        "data": user
                    });
                }
            });
        });

        app.get("/logout", function(request,response){
            response.redirect("/login");
        });

        app.post("/uploadCoverPhoto", function(request,response){
            var accessToken = request.fields.accessToken;
            var coverPhoto = "";

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."    
                    });
                } else {
                    if(request.files.coverPhoto.size >0 && request.files.coverPhoto.type.includes("image")){
                        if(user.coverPhoto != ""){
                            fileSystem.unlink(user.CoverPhoto, function(error){
                                //
                            });
                        }

                        coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
                        fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function(error){
                            //
                        });

                        database.collection("users").updateOne({
                            "accessToken": accessToken
                        },{
                            $set: {
                                "coverPhoto": coverPhoto
                            }
                        },function(error,data){
                            response.json({
                                "status": "status",
                                "message": "Cover photo has been updated.",
                                data: mainURL + "/" + coverPhoto
                            });
                        });
                    } else {
                        response.json({
                            "status": "error",
                            "message": "Please select a valid image."
                        });
                    }
                }
            });
        });

        app.post("/uploadProfileImage", function(request,response){
            var accessToken = request.fields.accessToken;
            var profileImage = "";

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."    
                    });
                } else {
                    if(request.files.profileImage.size >0 && request.files.profileImage.type.includes("image")){
                        if(user.profileImage != ""){
                            fileSystem.unlink(user.profileImage, function(error){
                                //
                            });
                        }

                        profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
                        fileSystem.rename(request.files.profileImage.path, profileImage, function(error){
                            //
                        });

                        database.collection("users").updateOne({
                            "accessToken": accessToken
                        },{
                            $set: {
                                "profileImage": profileImage
                            }
                        },function(error,data){
                            response.json({
                                "status": "status",
                                "message": "Profile image has been updated.",
                                data: mainURL + "/" + profileImage
                            });
                        });
                    } else {
                        response.json({
                            "status": "error",
                            "message": "Please select a valid image."
                        });
                    }
                }
            });
        });

        app.post("/updateProfile", function(request,response){
            var accessToken = request.fields.accessToken;
            var name = request.fields.name;
            var dob = request.fields.dob;
            var city = request.fields.city;
            var country = request.fields.country;
            var aboutMe = request.fields.aboutMe;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    database.collection("users").updateOne({
                        "accessToken": accessToken
                    }, {
                        $set: {
                            "name": name,
                            "dob": dob,
                            "city": city,
                            "country": country,
                            "aboutMe": aboutMe
                        }
                    }, function(error,data){
                        response.json({
                            "status": "status",
                            "message": "Profile has been updated."
                        });
                    });
                }
            });
        });

        app.get("/",function(request,response){
            response.render("index");
        });

        app.post("/addPost", function(request,response){

            var accessToken = request.fields.accessToken;
            var caption = request.fields.caption;
            var image = "";
            var video = "";
            var type = request.fields.type;
            var createdAt = new Date().getTime();
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    if(request.files.image.size > 0 && request.files.image.type.includes("image")){
                        image = "public/images/" + new Date().getTime() + "-" + request.files.image.name;
                        fileSystem.rename(request.files.image.path, image, function(error){
                            //
                        });
                    }

                    if(type == "page_post"){
                        database.collection("pages").findOne({
                            "_id": ObjectId(_id)
                        }, function (error, page) {
                            if (page == null) {
                                result.json({
                                    "status": "error",
                                    "message": "Page does not exist."
                                });
                                return;
                            } else {
                                if(page.user._id.toString() != user._id.toString()){
                                    result.json({
                                        "status": "error",
                                        "message": "Sorry, you do not own this page."
                                    });
                                    return;
                                }

                                database.collection("posts").insertOne({
                                    "caption": caption,
                                    "image": image,
                                    "video": video,
                                    "type": type,
                                    "createdAt": createdAt,
                                    "likers": [],
                                    "comments": [],
                                    "shares": [],
                                    "user": {
                                        "_id": page._id,
                                        "name": page.name,
                                        "profileImage": page.coverPhoto
                                    }
                                }, function(error,data){
                                        response.json({
                                            "status": "success",
                                            "message": "Post has been uploaded."
                                    });
                                });
                            }
                        });
                    }

                    if(request.files.video.size > 0 && request.files.video.type.includes("video")){
                        video = "public/videos/" + new Date().getTime() + "-" + request.files.video.name;
                        fileSystem.rename(request.files.video.path, video, function(error){
                            //
                        });
                    }
                    database.collection("posts").insertOne({
                        "caption": caption,
                        "image": image,
                        "video": video,
                        "type": type,
                        "createdAt": createdAt,
                        "likers": [],
                        "comments": [],
                        "shares": [],
                        "user": {
                            "_id": user._id,
                            "name": user.name,
                            "profileImage": user.profileImage
                        }
                    }, function(error,data){
                        database.collection("users").updateOne({
                            "accessToken": accessToken
                        }, {
                            $push: {
                                "posts": {
                                    "_id": data.insertedId,
                                    "caption": caption,
                                    "image": image,
                                    "video": video,
                                    "type": type,
                                    "createdAt": createdAt,
                                    "likers": [],
                                    "comments": [],
                                    "shares": [],
                                }
                            }
                        }, function(error,data){
                            response.json({
                                "status": "success",
                                "message": "Post has been uploaded."
                            });
                        });
                    });
                }
            });
        });

        app.post("/getNewsfeed", function(request,response){
            var accessToken = request.fields.accessToken;
            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    var ids = [];
                    ids.push(user._id);

                    for(var a=0; a<user.pages.length;a++){
                        ids.push(user.pages[a]._id);
                    }

                    database.collection("posts")
                    .find({
                        "user._id": {
                            $in: ids
                        }
                    })
                    .sort({
                        "createdAt": -1
                    })
                    .limit(5)
                    .toArray(function(error,data){
                        response.json({
                            "status": "success",
                            "message": "Record has been fetched",
                            "data": data
                        });
                    });
                }
            });
        });

        app.post("/toggleLikePost", function(request,response){

            var accessToken = request.fields.accessToken;
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    response.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {

                    database.collection("posts").findOne({
                        "_id": ObjectId(_id)
                    }, function(error,post){
                        if(post == null){
                            response.json({
                                "status": "error",
                                "message": "Post does not exist."
                            });
                        } else {

                            var isLiked = false;
                            for(var a = 0; a < post.likers.length; a++){
                                var liker = post.likers[a];

                                if(liker._id.toString() == user._id.toString()){
                                    isLiked = true;
                                    break;
                                }
                            }

                            if(isLiked){
                                database.collection("posts").updateOne({
                                    "_id": ObjectId(_id)
                                }, {
                                    $pull: {
                                        "likers": {
                                            "_id": user._id,
                                        }
                                    }
                                }, function(error,data){

                                    database.collection("users").updateOne({
                                        $and: [{
                                            "_id": post.user._id
                                        }, {
                                            "posts._id": post._id
                                        }]
                                    }, {
                                        $pull: {
                                            "posts.$[].likers": {
                                                "_id": user._id,
                                            }
                                        }
                                    });

                                    response.json({
                                        "status": "unliked",
                                        "message": "Post has been unliked."
                                    });
                                });
                            } else {

                                database.collection("users").updateOne({
                                    "_id": post.user._id
                                }, {
                                    $push: {
                                        "notifications": {
                                            "_id": ObjectId(),
                                            "type": "photo_liked",
                                            "content": user.name + " has liked your photo.",
                                            "profileImage": user.profileImage,
                                            "createdAt": new Date().getTime()
                                        }
                                    }
                                });

                                database.collection("posts").updateOne({
                                    "_id": ObjectId(_id)
                                }, {
                                    $push: {
                                        "likers": {
                                            "_id": user._id,
                                            "name": user.name,
                                            "profileImage": user.profileImage
                                        }
                                    }
                                }, function(error,data){

                                    database.collection("users").updateOne({
                                        $and: [{
                                            "_id": post.user._id
                                        }, {
                                            "posts._id": post.id
                                        }]
                                    }, {
                                        $push: {
                                            "posts.$[].likers": {
                                                "_id": user._id,
                                                "name": user.name,
                                                "profileImage": user.profileImage
                                            }
                                        }
                                    });

                                    response.json({
                                        "status": "success",
                                        "message": "Post has been liked."
                                    });
                                });
                            }
                        }
                    });
                }
            });
        });

        app.post("/postComment", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var comment = request.fields.comment;
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {

							var commentId = ObjectId();

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"comments": {
										"_id": commentId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"comment": comment,
										"createdAt": createdAt,
										"replies": []
									}
								}
							}, function (error, data) {

								if (user._id.toString() != post.user._id.toString()) {
									database.collection("users").updateOne({
										"_id": post.user._id
									}, {
										$push: {
											"notifications": {
												"_id": ObjectId(),
												"type": "new_comment",
												"content": user.name + " commented on your post.",
												"profileImage": user.profileImage,
												"post": {
													"_id": post._id
												},
												"isRead": false,
												"createdAt": new Date().getTime()
											}
										}
									});
								}

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$push: {
										"posts.$[].comments": {
											"_id": commentId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage,
											},
											"comment": comment,
											"createdAt": createdAt,
											"replies": []
										}
									}
								});

								database.collection("posts").findOne({
									"_id": ObjectId(_id)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "Comment has been posted.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});

		app.post("/postReply", function (request, result) {

			var accessToken = request.fields.accessToken;
			var postId = request.fields.postId;
			var commentId = request.fields.commentId;
			var reply = request.fields.reply;
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(postId)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {

							var replyId = ObjectId();

							database.collection("posts").updateOne({
								$and: [{
									"_id": ObjectId(postId)
								}, {
									"comments._id": ObjectId(commentId)
								}]
							}, {
								$push: {
									"comments.$.replies": {
										"_id": replyId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"reply": reply,
										"createdAt": createdAt
									}
								}
							}, function (error, data) {

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}, {
										"posts.comments._id": ObjectId(commentId)
									}]
								}, {
									$push: {
										"posts.$[].comments.$[].replies": {
											"_id": replyId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage,
											},
											"reply": reply,
											"createdAt": createdAt
										}
									}
								});

								database.collection("posts").findOne({
									"_id": ObjectId(postId)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "Reply has been posted.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});

		app.post("/sharePost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var type = "shared";
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Post does not exist."
							});
						} else {

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"shares": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage
									}
								}
							}, function (error, data) {

								database.collection("posts").insertOne({
									"caption": post.caption,
									"image": post.image,
									"video": post.video,
									"type": type,
									"createdAt": createdAt,
									"likers": [],
									"comments": [],
									"shares": [],
									"user": {
										"_id": user._id,
										"name": user.name,
										"gender": user.gender,
										"profileImage": user.profileImage
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$push: {
											"posts.$[].shares": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage
											}
										}
									});

									result.json({
										"status": "success",
										"message": "Post has been shared."
									});
								});
							});
						}
					});
				}
			});
		});

		app.get("/search/:query", function (request, result) {
			var query = request.params.query;
			result.render("search", {
				"query": query
			});
		});

		app.post("/search", function (request, result) {
			var query = request.fields.query;
			database.collection("users").find({
				"name": {
					$regex: ".*" + query + ".*",
					$options: "i"
				}
			}).toArray(function (error, data) {
                database.collection("pages").find({
                    "name": {
                        $regex: ".*" + query + ".*",
                        $options: "i"
                    }
                }).toArray(function (error, pages) {
    
                    result.json({
                        "status": "success",
                        "message": "Record has been fetched",
                        "data": data,
                        "pages": pages
                    });
                });
			});
		});

		app.get("/friends", function (request, result) {
			result.render("friends");
		});

		app.get("/inbox", function (request, result) {
			result.render("inbox");
        });

        app.get("/createPage", function (request, result) {
			result.render("createPage");
        });

        app.post("/createPage", function (request, result) {
			var accessToken = request.fields.accessToken;
            var name = request.fields.name;
            var domainName = request.fields.domainName;
            var additionalInfo = request.fields.additionalInfo;
            var coverPhoto = "";
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {

                    if(request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")){
                        coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
                        fileSystem.rename(request.files.coverPhoto.path,coverPhoto,function(error){
                            //
                        });
                        database.collection("pages").insertOne({
                            "name":name,
                            "domainName":domainName,
                            "additionalInfo":additionalInfo,
                            "coverPhoto":coverPhoto,
                            "likers":[],
                            "user":{
                                "_id":user._id,
                                "name":user.name,
                                "profileImage":user.profileImage
                            }
                        }, function(error,data){
                            result.json({
                                "status": "success",
                                "message": "Page has been created."
                            });
                        });
                    } else {
                        result.json({
                            "status": "error",
                            "message": "Please select a cover photo."
                        });
                    }
                }
            });
        });

        app.post("/getPages", function (request, result) {
			var accessToken = request.fields.accessToken;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
                    database.collection("pages").find({
                        $or: [{
                            "user._id": user._id
                        }, {
                            "likers._id": user._id
                        }]
                    }).toArray(function(error,data){
                        result.json({
                            "status": "success",
                            "message": "Record has been fetched.",
                            "data": data
                        });
                    });
                }
            });
        });

        app.get("/page/:_id",function(request,result){
            var _id = request.params._id;

            database.collection("pages").findOne({
                "_id": ObjectId(_id)
            }, function(error,page){
                if(page == null){
                    result.json({
                        "status": "error",
                        "message": "Page does not exist."
                    });
                } else {
                    result.render("singlePage",{
                        "_id": _id
                    });
                }
            });
        });

        app.post("/getPageDetail", function (request, result) {
			var _id = request.fields._id;

			database.collection("pages").findOne({
                "_id": ObjectId(_id)
            }, function(error,page){
                if(page == null){
                    result.json({
                        "status": "error",
                        "message": "Page does not exist."
                    });
                } else {
                        database.collection("posts").find({
                            $and: [{
                                "user._id": page._id
                            }, {
                                "type": "page_post"
                            }]
                        }).toArray(function(error,posts){
                            result.json({
                                "status": "success",
                                "message": "Record has been fetched.",
                                "data": page,
                                "posts": posts
                            });
                        });
                    }
                });
                
            });
        
        
        app.post("/getFriendsChat", function (request, result) {
			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
                    var index = user.friends.findIndex(function(friend){
                        return friend._id == _id;
                    });
                    var inbox = user.friends[index].inbox;

                    result.json({
                        "status": "success",
                        "message": "Record has been fetched",
                        "data": inbox
                    });
                }
		    });
        });

        app.post("/sendMessage", function (request, result) {
			var accessToken = request.fields.accessToken;
            var _id = request.fields._id;
            var message = request.fields.message;
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
                    var me = user;
                    database.collection("users").findOne({
                        "_id": ObjectId(_id)
                    }, function(error,user){
                        if(user == null){
                            result.json({
                                "status": "error",
                                "message": "User does not exist."
                            });
                        } else {
                            database.collection("users").updateOne({
                                $and: [{
                                    "_id": ObjectId(_id)
                        },{ 
                            "friends._id": me._id    
                                }]
                        },{
                            $push: {
                                "friends.$.inbox": {
                                    "_id": ObjectId(),
                                    "message": message,
                                    "form": me._id
                                }
                            }
                        }, function(error,data){
                            database.collection("users").updateOne({
                                $and: [{
                                    "_id": me._id
                                },{
                                    "friends._id": user._id    
                                }]
                            },{
                                $push:{
                                    "friends.$.inbox": {
                                        "_id": ObjectId(),
                                        "message": message,
                                        "form": me._id
                                    }
                                }
                            }, function(error,data){

                                socketIO.to(users[user._id]).emit("messageReceived",{
                                    "message": message,
                                    "from": me._id
                                });
                                result.json({
                                    "status": "success",
                                    "message": "Message has been sent."
                                });   
                            });
                        });
                    }
                });
            }
        });
        });

        app.post("/connectSocket",function(request,result){
            var accessToken = request.fields.accessToken;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
                    users[user._id] = socketID;
                    result.json({
                        "status": "success",
                        "message": "Socket has been connected."
                    });
                }
            });
        });
		app.get("/pages", function (request, result) {
			result.render("pages");
		});

		app.get("/groups", function (request, result) {
			result.render("groups");
		});

		app.get("/notifications", function (request, result) {
			result.render("notifications");
		});

		app.post("/markNotificationsAsRead", function (request, result) {
			var accessToken = request.fields.accessToken;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					database.collection("users").updateMany({
						$and: [{
							"accessToken": accessToken
						}, {
							"notifications.isRead": false
						}]
					}, {
						$set: {
							"notifications.$.isRead": true
						}
					}, function (error, data) {
						result.json({
							"status": "success",
							"message": "Notifications has been marked as read."
						});
					});
				}
			});
        });
        
        app.get("/verifyEmail/:email/:verification_token", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.get("/ResetPassword/:email/:reset_token", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.get("/forgot-password", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.post("/sendRecoveryLink", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.post("/changePassword", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.post("/toggleJoinGroup", function (request, result) {
			// Paid version only
			// Please read README.txt to get full version.
		});

		app.post("/sendFriendRequest", function (request, result) {
            
            var accessToken = request.fields.accessToken;
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "Friend Request Error"
                    });
                } else {
                    var me = user;
                    database.collection("users").findOne({
                        "_id": ObjectId(_id)
                    } ,function(error,user){
                        //console.log(user);
                        if(user == null){
                            result.json({
                                "status": "error",
                                "message": "User does not exist."
                            });
                        } else {
                            database.collection("users").updateOne({
                                "_id": ObjectId(_id)
                            }, {
                                $push: {
                                    "friends": {
                                        "_id": me._id,
                                        "name": me.name,
                                        "profileImage": me.profileImage,
                                        "status": "Pending",
                                        "sentByMe": false,
                                        "inbox": []
                                    }
                                }
                            }, function(error,data){
                                database.collection("users").updateOne({
                                    "_id": me._id
                                },{
                                    $push:{
                                        "friends":{
                                            "_id": user._id,
                                            "name": user.name,
                                            "profileImage": user.profileImage,
                                            "status": "Pending",
                                            "sentByMe": true,
                                            "inbox": []
                                        }
                                    }
                                }, function(error,data){
                                    result.json({
                                        "status": "success",
                                        "message": "Friend request has been sent."
                                    });
                                });
                            });
                        }
                    });
                }
            });
		});

		app.post("/acceptFriendRequest", function (request, result) {
            console.log("Called");
            var accessToken = request.fields.accessToken;
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            },function(error,user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    var me =user;
                    database.collection("users").findOne({
                        "_id": ObjectId(_id)
                    }, function(error,user){
                        if(user == null){
                            result.json({
                                "status": "error",
                                "message": "User does not exist."
                            });
                        } else {
                            database.collection("users").updateOne({
                                "_id": ObjectId(_id)
                            }, {
                                $push: {
                                    "notifications": {
                                        "_id": ObjectId(),
                                        "type": "friend_request_accepted",
                                        "content": me.name + " accepted your friend request.",
                                        "profileImage": me.profileImage,
                                        "createdAt": new Date().getTime()
                                    }
                                }
                            });

                            database.collection("users").updateOne({
                                $and: [{
                                    "_id": ObjectId(_id)
                                },{
                                    "friends._id": me._id
                                }]
                            },{
                                $set: {
                                    "friends.$.status": "Accepted"
                                }
                            },function(error,data){
                                database.collection("users").updateOne({
                                    $and: [{
                                        "_id": me._id
                                    },{
                                        "friends._id": user._id
                                    }]
                                }, {
                                    $set: {
                                        "friends.$.status": "Accepted"
                                    }
                                }, function(error,data){
                                    result.json({
                                        "status": "success",
                                        "message": "Friend request has been accepted."
                                    });
                                });
                            });
                        }
                    });
                }
            });
        });
        
        app.post("/unfriend", function (request, result) {
            var accessToken = request.fields.accessToken;
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            },function(error,user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    var me = user;
                    database.collection("users").findOne({
                        "_id": ObjectId(_id)
                    }, function(error,user){
                        if(user == null){
                            result.json({
                                "status": "error",
                                "message": "User does not exist."
                            });
                        } else {
                            database.collection("users").updateOne({
                                "_id": ObjectId(_id)
                            }, {
                                $pull: {
                                   "friends": {
                                       "_id": me._id
                                   } 
                                }
                            }, function(error,data){
                                database.collection("users").updateOne({
                                    "_id": me._id
                                }, {
                                    $pull: {
                                       "friends": {
                                           "_id": user._id
                                       } 
                                    }
                            },function(error,data){
                                result.json({
                                    "status": "success",
                                    "message": "Friend has been removed."
                                });
                            });
                        });
                    }
                    });
                }
            });
        });

        app.post("/toggleLikePage", function (request, result) {
            
            var accessToken = request.fields.accessToken;
            var _id = request.fields._id;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    database.collection("pages").findOne({
                        "_id": ObjectId(_id)
                    }, function(error,page){
                        if(paage == null){
                            result.json({
                                "status": "error",
                                "message": "Page does not exist."
                            });
                        } else {
                            var isLiked = false;
                            for(var a = 0;a< page.likers.length;a++){
                                var liker = page.likers[a];

                                if(liker._id.toString()==user._id.toString()){
                                    isLiked = true;
                                    break;
                                }
                            }

                            if(isLiked){
                                database.collection("pages").updateOne({
                                    "_id": ObjectId(_id)
                                },{
                                    $pull: {
                                        "likers": {
                                            "_id": user._id,
                                        }
                                    }
                                }, function(error,data){
                                    database.collection("users").updateOne({
                                        "accessToken": accessToken
                                    }, {
                                        $pull: {
                                            "pages": {
                                                "_id": ObjectId(_id)
                                            }
                                        }
                                    },function(error,data){
                                        result.json({
                                            "status": "unliked",
                                            "message": "Page has been unliked."
                                        });
                                    });
                                });
                            } else {
                                database.collection("pages").updateOne({
                                    "_id": ObjectId(_id)
                                },{
                                    $push: {
                                        "likers": {
                                            "_id": user._id,
                                            "name": user.name,
                                            "profileImage": user.profileImage
                                        }
                                    }
                                }, function(error,data){
                                    database.collection("users").updateOne({
                                        "accessToken": accessToken
                                    }, {
                                        $push: {
                                            "pages": {
                                                "_id": page._id,
                                                "name": page.name,
                                                "coverPhoto": page.coverPhoto
                                            }
                                        }
                                    },function(error,data){
                                        result.json({
                                            "status": "success",
                                            "message": "Page has been liked."
                                        });
                                    });
                                });
                            }
                        }
                    });
                }
            });
        });

        app.post("/getMyPages", function (request, result) {
            
            var accessToken = request.fields.accessToken;

            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error,user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login again."
                    });
                } else {
                    database.collection("pages").find({
                        "user._id": user._id
                    }).toArray(function(error,data){
                        result.json({
                            "status": "success",
                            "message": "Record has been fetched.",
                            "data": data
                        });
                    });
                }
            });
        });
    });
});