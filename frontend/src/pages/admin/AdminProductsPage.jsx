import { Button, Card, Modal, Space, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../../services/productService";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = (productId) => {
    Modal.confirm({
      title: "Delete this product?",
      content: "This will remove the product from the catalog.",
      onOk: async () => {
        await deleteProduct(productId);
        await loadProducts();
      }
    });
  };

  return (
    <Card
      title="Products"
      className="nuva-card"
      extra={
        <Link to="/admin/products/new">
          <Button type="primary">Add Product</Button>
        </Link>
      }
    >
      <Table
        rowKey="_id"
        dataSource={products}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Category", dataIndex: "category" },
          { title: "Price", dataIndex: "price", render: (value) => `$${value}` },
          { title: "Stock", dataIndex: "stock" },
          {
            title: "Featured",
            dataIndex: "isFeatured",
            render: (value) => <Tag color={value ? "green" : "default"}>{String(value)}</Tag>
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Link to={`/admin/products/${record._id}`}>
                  <Button>Edit</Button>
                </Link>
                <Button danger onClick={() => handleDelete(record._id)}>
                  Delete
                </Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}
