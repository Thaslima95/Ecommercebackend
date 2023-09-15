const express=require('express')
const mysql=require('mysql')
const cors=require('cors')
var bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.json()) 


app.use(cors())

const db=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"aafiya.",
    database:"ecommerce"

})

db.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

app.post('/adduser',(req,res)=>{
    const name=req.body.name;
    const email=req.body.email;
    const password=req.body.password;
    const sql="INSERT INTO users (user_name,user_email,user_password) VALUES ?";
    const value=[[name,email,password]];
    db.query(sql,[value],(err,data)=>{
        if(err) throw err;
        console.log(data)
    })
    return res.json("added user")
})


app.post('/addproduct',(req,res)=>{
    const title=req.body.title;
    const description=req.body.description;
    const price=req.body.price;
    const image=req.body.image;
    const quantity=req.body.quantity;
    const category=req.body.category;
    
    const sql="INSERT INTO products (product_title,product_description,product_price,product_image,inventory_quantity,category) VALUES ?";
    const value=[[title,description,price,image,quantity,category]];
    db.query(sql,[value],(err,data)=>{
        if(err) throw err;
        console.log(data)
    })
    return res.json("added product")
})

app.get("/allproducts",(req,res)=>{
    const sql="SELECT * FROM products";
    db.query(sql,(err,data)=>{
        if(err) throw err;
       
        return res.json(data)
    })
})

app.get("/typeofcategory",(req,res)=>{
    const sql="Select Distinct(category) from products where is_deleted=0";
    db.query(sql,(err,data)=>{
        if(err) throw err;
        return res.json(data)
    })

})

app.get("/category/:category",(req,res)=>{
    const category=req.params.category;
    const sql="SELECT * from products WHERE category=? and is_deleted=0";
    db.query(sql,[category],(err,data)=>{
        if(err) throw err;
        return res.json(data)
    })

})



app.post("/addtocart",(req,res)=>{
    const productid=req.body.productid;
    const quantity=req.body.quantity;
    const userid=req.body.user_id;
    console.log(productid)
    const sql=`SELECT product_price,inventory_quantity from products where product_id =${productid} AND inventory_quantity >0 and is_deleted=0`
    db.query(sql,(err,data)=>{
        if(err) throw err;
        console.log(data)
        if(data.length >0)
        {
            console.log(data[0].product_price)
            const sql=`INSERT INTO cart (product_id,quantity,user_id,cart_total) VALUES (${productid},${quantity},${userid},${data[0].product_price*quantity})`
             db.query(sql,(err,data)=>{
                if(err) throw err;
                const sql=`UPDATE Products SET inventory_quantity=inventory_quantity- ${quantity} where product_id=${productid}`
                db.query(sql,(err,data)=>{
                    if(err) throw err;
                    else{
                        const sql=`select product_price,product_title ,quantity from products as p inner join cart as c on p.product_id=c.product_id where c.user_id=${userid} and c.is_deleted=0`
                if(err) throw err;
                return res.json(data)
                    }
                })
             })
        }
    })
})


app.patch("/updatecart",(req,res)=>{
     console.log(req.body.product_id)
    const productid=req.body.product_id;
    const userid=req.body.user_id;
    const quantity=req.body.quantity;
    const sql=`select product_price,quantity from cart as c inner join products as p on c.product_id=p.product_id where c.product_id=${productid} and c.user_id=${userid} and c.is_deleted=0`
    db.query(sql,(err,data)=>{
        if(err) throw err;
        if(data.length>0)
        {
            const oldquantity=data[0].quantity;
            if(oldquantity<quantity)
            {
                const diff=oldquantity-quantity;
                const sql=`UPDATE cart set quantity=${quantity} ,cart_total=${data[0].product_price*quantity} where product_id=${productid} and user_id=${userid} `
                 db.query(sql,(err,data)=>{
                if(err) throw err;
                const sql=`UPDATE Products SET inventory_quantity=inventory_quantity+ ${diff} where product_id=${productid}`
                db.query(sql,(err,data)=>{
                    if(err) throw err;
                    return res.json("cart updated")
                })
            })
            }
            else{
                const diff=quantity-oldquantity;
                const sql1=`SELECT product_id from products where inventory_quantity > 0`;
                db.query(sql1,(err,data)=>{
                    if(data.length>0)
                    {
                    const sql=`UPDATE cart set quantity=${quantity} ,cart_total=${data[0].product_price*quantity} where product_id=${productid} and user_id=${userid} `
                 db.query(sql,(err,data)=>{
                if(err) throw err;
                const sql=`UPDATE Products SET inventory_quantity=inventory_quantity- ${diff} where product_id=${productid}`
                db.query(sql,(err,data)=>{
                    if(err) throw err;
                    return res.json("cart updated")
                })
            })
                    }
                })
             
           
        }
    }})
})

app.patch("/removecart/:productid",(req,res)=>{
    const productid=req.params.productid;
    const userid=req.body.user_id;
    const quantity=req.body.quantity;
     const sql=`DELETE FROM cart where product_id=${productid} and user_id=${userid}`
     db.query(sql,(err,data)=>{
if(err) throw err;
     const sql=`UPDATE products SET inventory_quantity=inventory_quantity+${quantity} where product_id=${productid}`
     db.query(sql,(err,data)=>{
        if(err) throw err;
        return res.json("cart removed")
     })
     })
})

app.get('/cartdetails/:user_id',(req,res)=>{
    const userid=req.params.user_id;
    console.log(userid)
    const sql=`select product_price,product_title ,quantity,cart_total from products as p inner join cart as c on p.product_id=c.product_id where c.user_id=${userid} and c.is_deleted=0`
    db.query(sql,(err,data)=>{
      if(err) throw err;
    return res.json(data)
    })   
})

app.post('/proceedtocheckout/:user_id',(req,res)=>{
    const values=[];
    const userid=req.params.user_id;
    const sql=`SELECT sum(cart_total)as total,product_id from cart where user_id=${userid} and is_deleted=0 group by product_id`
    db.query(sql,(err,data)=>{
        if(err) throw err;
        if(data.length>0)
        {
           data.map((e)=>values.push(['order placed','COD',e.product_id,e.total,userid,0]))
           const sql=`INSERT INTO orders (order_status,order_type,product_id,total_price,user_id,is_deleted) VALUES ?`;
           db.query(sql,[values],(err,data)=>{
            if(err) throw err;
            const sql1=`UPDATE cart SET is_deleted=1 where user_id=${userid}`;
            db.query(sql1,(err,datas)=>{
                if(err) throw err;
                return res.json("order placed")
            })
           })
        }
    })
})

app.get('/products/:producttitle',(req,res)=>{
    const producttitle=req.params.producttitle;
    console.log(producttitle)
    const sql=`Select product_title,product_image,product_price from products where product_title Like '%${producttitle}%'`;
    db.query(sql,(err,data)=>{
        if(err) throw err;
        return res.json(data)
    })
})





app.get('/orders/:userid',(req,res)=>{
    const userid=req.params.userid;
    const sql=`select product_title,product_price,order_type,order_status,o.created_at,o.order_booking_date from orders as o inner join products as p on o.product_id=p.product_id where user_id=${userid} and o.is_deleted=0`;
    db.query(sql,(err,data)=>{
        if(err) throw err;
        return res.json(data)
    })
})


// app.get('/ordersbydate/:userid/:startdate/:enddate',(req,res)=>{
//     const userid=req.params.userid;
//     const startdate=req.params.startdate;
//     const enddate=req.params.enddate;

// })
app.get('/filter/:price1/:price2',(req,res)=>{
    const price1=req.params.price1;
    const price2=req.params.price2;
    const sql=`SELECT PRODUCT_TITLE,PRODUCT_PRICE,PRODUCT_IMAGE,PRODUCT_DESCRIPTION FROM PRODUCTS WHERE PRODUCT_PRICE BETWEEN ${price1} AND ${price2}`;
    db.query(sql,(err,data)=>{
        if(err) throw err;
        return res.json(data)
    })
})



//Not yet checked still trying
// app.patch('/ordershistory/:userid/id',(req,res)=>{
//     const userid=req.params.userid;
//     const productid=req.params.id;
//     const sql=`UPDATE orders SET is_deleted=1 where user_id=${userid} and product_id=${productid}`;
//     db.query(sql,(err,data)=>{
//         if(err) throw err;
//         return res.json(data)
//     })
// })

app.listen(8082,()=>{
    console.log("listening backend")
})