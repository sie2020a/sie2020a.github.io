using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    float speed = 3.0f;
    Rigidbody2D rigid;

    void Start()
    {
        rigid = GetComponent<Rigidbody2D>();
    }

    void FixedUpdate()
    {
        rigid.velocity = transform.right * Input.GetAxisRaw("Horizontal") * speed;
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.tag == "Egg")
        {
            Score.score++;
            Destroy(collision.gameObject);
        }
        else if (collision.gameObject.tag == "Bomb")
        {
            if (Score.score > 0)
            {
                Score.score--;
            }
            Destroy(collision.gameObject);
        }
    }
}
